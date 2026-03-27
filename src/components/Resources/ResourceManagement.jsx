import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../contexts/UserContext';
import { FaPlus, FaEdit, FaTrash, FaExternalLinkAlt } from 'react-icons/fa';
import { getLinkType } from '../../utils/videoUtils';
import './ResourceManagement.css';

/**
 * ResourceManagement Component
 * Allows admins and therapists to create, edit, and delete resources
 */
const ResourceManagement = ({ userRole }) => {
  const { user } = useUser();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const RESOURCE_CATEGORIES = [
    { value: 'depression', label: 'Depression' },
    { value: 'anxiety', label: 'Anxiety' },
    { value: 'emotional_regulation', label: 'Emotional Regulation' },
    { value: 'stress_management', label: 'Stress Management' },
    { value: 'crisis_support', label: 'Crisis Support' },
    { value: 'substance_use', label: 'Alcohol & substance use' },
    { value: 'tuition_financial', label: 'Tuition & financial stress' },
    { value: 'sexual_health', label: 'Pornography, masturbation & sexual health' },
    { value: 'relationships', label: 'Relationship issues' },
  ];

  const getCategoryBadgeClass = (category) => {
    const map = {
      stress_management: 'badge-stress',
      anxiety: 'badge-anxiety',
      depression: 'badge-depression',
      emotional_regulation: 'badge-academic',
      crisis_support: 'badge-crisis',
      substance_use: 'badge-substance',
      tuition_financial: 'badge-financial',
      sexual_health: 'badge-sexual',
      relationships: 'badge-relationships',
    };
    return map[category] || 'badge-stress';
  };

  const getResourceType = (resource) => {
    if (!resource.link) return 'Content';
    const linkType = getLinkType(resource.link);
    if (linkType === 'youtube') return 'YouTube';
    if (linkType === 'vimeo') return 'Vimeo';
    return 'Link';
  };

  const getTypeBadgeClass = (resource) => {
    if (!resource.link) return 'badge-content';
    const linkType = getLinkType(resource.link);
    if (linkType === 'youtube') return 'badge-youtube';
    if (linkType === 'vimeo') return 'badge-vimeo';
    return 'badge-link';
  };

  const filteredResources = resources.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      (r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.tags || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesCategory = filterCategory === 'all' || r.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    link: '',
    tags: '',
    category: 'stress_management',
    visibility_scope: userRole === 'admin' ? 'system' : 'therapist_all'
  });

  const fetchResources = useCallback(async () => {
    if (!user) return;

    // Verify user role matches expected role
    const actualUserRole = user.user_metadata?.role;
    if (actualUserRole !== userRole && actualUserRole !== 'admin') {
      setError('Unauthorized access. Please log in with the correct account type.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      let data, fetchError;

      // Admins see all resources, therapists see their own + admin resources
      if (userRole === 'therapist') {
        // Fetch admin resources and therapist's own resources separately, then combine
        const [adminResult, therapistResult] = await Promise.all([
          supabase
            .from('resources')
            .select('*')
            .eq('created_by_role', 'admin')
            .order('created_at', { ascending: false }),
          supabase
            .from('resources')
            .select('*')
            .eq('created_by_role', 'therapist')
            .eq('therapist_id', user.id)
            .order('created_at', { ascending: false })
        ]);

        if (adminResult.error) throw adminResult.error;
        if (therapistResult.error) throw therapistResult.error;

        // Combine results
        data = [...(adminResult.data || []), ...(therapistResult.data || [])];
        // Sort by created_at descending
        data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      } else if (userRole === 'admin') {
        // Admins see all resources
        const result = await supabase
          .from('resources')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (result.error) throw result.error;
        data = result.data || [];
      } else {
        data = [];
      }

      setResources(data || []);
    } catch (err) {
      console.error('Error fetching resources:', err);
      setError('Failed to load resources. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [user, userRole]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleOpenModal = (resource = null) => {
    if (resource) {
      setEditingResource(resource);
      setFormData({
        title: resource.title || '',
        content: resource.content || '',
        link: resource.link || '',
        tags: (resource.tags || []).join(', '),
        category: resource.category || 'stress_management',
        visibility_scope: resource.visibility_scope || (userRole === 'admin' ? 'system' : 'therapist_all')
      });
    } else {
      setEditingResource(null);
      setFormData({
        title: '',
        content: '',
        link: '',
        tags: '',
        category: 'stress_management',
        visibility_scope: userRole === 'admin' ? 'system' : 'therapist_all'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingResource(null);
    setFormData({
      title: '',
      content: '',
      link: '',
      tags: '',
      category: 'stress_management',
      visibility_scope: userRole === 'admin' ? 'system' : 'therapist_all'
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    // Verify user role
    const actualUserRole = user.user_metadata?.role;
    if (actualUserRole !== userRole && actualUserRole !== 'admin') {
      alert('Unauthorized: Only admins and therapists can create resources.');
      return;
    }

    try {
      // Validate: category is required
      const validCategories = RESOURCE_CATEGORIES.map(c => c.value);
      if (!formData.category || !validCategories.includes(formData.category)) {
        alert('Please select a category.');
        return;
      }

      // Validate: at least one of content or link must be provided
      if (!formData.content.trim() && !formData.link.trim()) {
        alert('Please provide either content or a link.');
        return;
      }

      // Parse tags (comma-separated string to array)
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const resourceData = {
        title: formData.title.trim(),
        content: formData.content.trim() || null,
        link: formData.link.trim() || null,
        tags: tagsArray,
        category: formData.category,
        created_by_role: userRole,
        visibility_scope: formData.visibility_scope,
        therapist_id: userRole === 'therapist' ? user.id : null
      };

      if (editingResource) {
        // Update existing resource
        const { error: updateError } = await supabase
          .from('resources')
          .update(resourceData)
          .eq('id', editingResource.id);

        if (updateError) throw updateError;
      } else {
        // Create new resource
        const { error: insertError } = await supabase
          .from('resources')
          .insert(resourceData);

        if (insertError) throw insertError;
      }

      handleCloseModal();
      fetchResources();
    } catch (err) {
      console.error('Error saving resource:', err);
      alert(`Failed to save resource: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDelete = async (resourceId) => {
    if (!confirm('Are you sure you want to delete this resource? This action cannot be undone.')) {
      return;
    }

    if (!user) return;

    // Verify user role
    const actualUserRole = user.user_metadata?.role;
    if (actualUserRole !== userRole && actualUserRole !== 'admin') {
      alert('Unauthorized: Only admins and therapists can delete resources.');
      return;
    }

    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', resourceId);

      if (error) throw error;
      fetchResources();
    } catch (err) {
      console.error('Error deleting resource:', err);
      alert(`Failed to delete resource: ${err.message || 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="resource-management-container">
        <div className="loading-state">Loading resources...</div>
      </div>
    );
  }

  return (
    <div className="resource-management-container">
      <h1 className="page-title">Manage Resources</h1>
      <button className="add-resource-btn" onClick={() => handleOpenModal()}>
        <FaPlus /> Add New Resource
      </button>

      {error && (
        <div className="error-banner">{error}</div>
      )}

      {resources.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h2>No Resources Yet</h2>
          <p>Start by adding your first resource to help students.</p>
        </div>
      ) : (
        <>
          <div className="table-controls">
            <input
              type="text"
              placeholder="Search resources..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              className="filter-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {RESOURCE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div className="content-table-card table-card">
            <table className="content-table resources-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Visibility</th>
                  <th>Tags</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResources.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-table-message">
                      No resources match your search or filter.
                    </td>
                  </tr>
                ) : (
                filteredResources.map(resource => (
                  <tr key={resource.id}>
                    <td className="resource-title">{resource.title}</td>
                    <td>
                      <span className={`badge-category ${getCategoryBadgeClass(resource.category)}`}>
                        {RESOURCE_CATEGORIES.find(c => c.value === resource.category)?.label || resource.category}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-type ${getTypeBadgeClass(resource)}`}>
                        {getResourceType(resource)}
                      </span>
                    </td>
                    <td>
                      <span className="badge-visibility">
                        {resource.visibility_scope === 'system' && 'System (All Students)'}
                        {resource.visibility_scope === 'therapist_all' && 'All Students'}
                        {resource.visibility_scope === 'therapist_attached' && 'Attached Students Only'}
                      </span>
                    </td>
                    <td>
                      <div className="tags-container">
                        {resource.tags && resource.tags.length > 0 ? (
                          resource.tags.map((tag, idx) => (
                            <span key={idx} className="tag-badge tag">
                              {tag === 'academice' ? 'academics' : tag}
                            </span>
                          ))
                        ) : (
                          <span className="no-tags">No tags</span>
                        )}
                      </div>
                    </td>
                    <td>{new Date(resource.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="edit-btn"
                          onClick={() => handleOpenModal(resource)}
                          title="Edit"
                        >
                          <FaEdit /> Edit
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(resource.id)}
                          title="Delete"
                        >
                          <FaTrash /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal-content resource-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingResource ? 'Edit Resource' : 'Add New Resource'}</h2>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="title">Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Managing Exam Stress"
                />
              </div>

              <div className="form-group">
                <label htmlFor="content">Content</label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  rows="6"
                  placeholder="Enter resource content here, or provide a link below..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="link">Link/URL</label>
                <input
                  type="url"
                  id="link"
                  name="link"
                  value={formData.link}
                  onChange={handleInputChange}
                  placeholder="https://www.youtube.com/watch?v=… or https://vimeo.com/…"
                />
                <small className="form-hint">
                  Provide either content or a link (or both). YouTube and Vimeo URLs play in the app; other links open in a new tab.
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="category">Category *</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                >
                  {RESOURCE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <small className="form-hint">Required. Used for resource recommendation.</small>
              </div>

              <div className="form-group">
                <label htmlFor="tags">Tags (comma-separated)</label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  placeholder="e.g., stress, anxiety, academics, sleep"
                />
                <small className="form-hint">Separate multiple tags with commas. For search and filter only.</small>
              </div>

              {userRole === 'therapist' && (
                <div className="form-group">
                  <label htmlFor="visibility_scope">Visibility *</label>
                  <select
                    id="visibility_scope"
                    name="visibility_scope"
                    value={formData.visibility_scope}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="therapist_all">Available to All Students</option>
                    <option value="therapist_attached">Available Only to Attached Students</option>
                  </select>
                  <small className="form-hint">
                    {formData.visibility_scope === 'therapist_all'
                      ? 'This resource will be visible to all students in the system'
                      : 'This resource will only be visible to students linked to you'}
                  </small>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" onClick={handleCloseModal} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingResource ? 'Update Resource' : 'Create Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceManagement;

