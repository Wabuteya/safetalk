import 'react-big-calendar/lib/css/react-big-calendar.css';
import React, { useState } from 'react';
import './ManageResourcesPage.css';

// MOCK DATA: Same as the one students see
const initialResources = [
  { id: 1, title: '5-Minute Mindfulness Meditation', type: 'VIDEO', category: 'Mindfulness', link: '#' },
  { id: 2, title: 'Understanding and Managing Anxiety', type: 'ARTICLE', category: 'Anxiety', link: '#' },
  { id: 3, title: 'The Pomodoro Technique for Studying', type: 'BLOG', category: 'Study Skills', link: '#' },
];

const ManageResourcesPage = () => {
  const [resources, setResources] = useState(initialResources);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // We can add editing functionality later
  // const [editingResource, setEditingResource] = useState(null);

  const handleAddNew = () => {
    // In a real app, you'd clear a form state here
    setIsModalOpen(true);
  };

  const handleDelete = (resourceId) => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
      setResources(resources.filter(r => r.id !== resourceId));
    }
  };

  const handleSaveResource = (e) => {
    e.preventDefault();
    // Logic to save a new or edited resource would go here
    alert('Resource saved! (Simulation)');
    setIsModalOpen(false);
  };

  return (
    <div className="manage-resources-layout">
      {/* --- ADD/EDIT MODAL --- */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content resource-modal">
            <h2>Add New Resource</h2>
            <form onSubmit={handleSaveResource}>
              <div className="form-group">
                <label>Title</label>
                <input type="text" required />
              </div>
              <div className="form-group">
                <label>Link/URL</label>
                <input type="url" required />
              </div>
              <div className="form-group">
                <label>Image URL</label>
                <input type="url" placeholder="e.g., https://via.placeholder.com/300x150" />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Type</label>
                  <select><option>VIDEO</option><option>ARTICLE</option><option>BLOG</option></select>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select><option>Mindfulness</option><option>Anxiety</option><option>Study Skills</option></select>
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows="3"></textarea>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setIsModalOpen(false)} className="modal-btn cancel">Cancel</button>
                <button type="submit" className="modal-btn confirm">Save Resource</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="page-header">
        <h1>Manage Motivational Resources</h1>
        <button className="add-new-btn" onClick={handleAddNew}>+ Add New Resource</button>
      </div>

      <div className="resources-table-container">
        <table className="resources-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Category</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {resources.map(resource => (
              <tr key={resource.id}>
                <td>{resource.title}</td>
                <td><span className={`type-badge ${resource.type.toLowerCase()}`}>{resource.type}</span></td>
                <td>{resource.category}</td>
                <td className="actions-cell">
                  <button className="action-btn edit">Edit</button>
                  <button onClick={() => handleDelete(resource.id)} className="action-btn delete">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageResourcesPage;