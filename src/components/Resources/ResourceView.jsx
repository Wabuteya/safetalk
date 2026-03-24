import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../contexts/UserContext';
import { FaExternalLinkAlt, FaVideo, FaBookOpen } from 'react-icons/fa';
import VideoEmbed from '../VideoEmbed';
import { getLinkType } from '../../utils/videoUtils';
import './ResourceView.css';

const TAG_COLORS = {
  stress: { bg: '#FFF0F0', text: '#7B1D1D', border: '#FECACA' },
  stress_management: { bg: '#FFF0F0', text: '#7B1D1D', border: '#FECACA' },
  academic: { bg: '#EEF2FF', text: '#003DA5', border: '#BFDBFE' },
  academice: { bg: '#EEF2FF', text: '#003DA5', border: '#BFDBFE' },
  anxiety: { bg: '#FFFBEB', text: '#92600A', border: '#FDE68A' },
  depression: { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' },
  sleep: { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' },
  emotional_regulation: { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' },
  crisis_support: { bg: '#FFF0F0', text: '#7B1D1D', border: '#FECACA' },
  default: { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' },
};

const FILTER_CATEGORIES = ['All', 'Stress', 'Anxiety', 'Sleep', 'Academic'];

/**
 * ResourceView Component
 * Displays resources for students with intelligent filtering and prioritization
 */
const ResourceView = () => {
  const { user } = useUser();
  const [allResources, setAllResources] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [linkedTherapist, setLinkedTherapist] = useState(null);
  const [hasMediumRiskJournal, setHasMediumRiskJournal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  // Fetch student's assessment data for prioritization
  const fetchAssessment = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: assessError } = await supabase
        .from('assessments')
        .select('challenges')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!assessError && data) {
        setAssessment(data);
      }
    } catch (err) {
      console.log('Assessment fetch failed (non-critical):', err);
    }
  }, [user]);

  // Fetch linked therapist
  const fetchLinkedTherapist = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: relError } = await supabase
        .from('therapist_student_relations')
        .select('therapist_id')
        .eq('student_id', user.id)
        .maybeSingle();

      if (!relError && data) {
        setLinkedTherapist(data);
      }
    } catch (err) {
      console.log('Therapist relationship fetch failed (non-critical):', err);
    }
  }, [user]);

  // Fetch medium-risk journal status via RPC (no direct journal_analysis access for students)
  const fetchMediumRiskStatus = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: rpcError } = await supabase.rpc('has_medium_risk_journal', {
        p_student_id: user.id
      });

      if (!rpcError && data === true) {
        setHasMediumRiskJournal(true);
      }
    } catch (err) {
      console.log('Medium-risk check failed (non-critical):', err);
    }
  }, [user]);

  // Fetch all visible resources
  const fetchResources = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      console.log('Fetching resources for user:', user.id);
      console.log('Linked therapist:', linkedTherapist);

      // Build query based on visibility rules
      // Always show: system resources + therapist_all resources
      // Fetch system resources
      const { data: systemResources, error: systemError } = await supabase
        .from('resources')
        .select('*')
        .eq('visibility_scope', 'system')
        .order('created_at', { ascending: false });

      // Fetch therapist_all resources
      const { data: therapistAllResources, error: therapistAllError } = await supabase
        .from('resources')
        .select('*')
        .eq('visibility_scope', 'therapist_all')
        .order('created_at', { ascending: false });

      if (systemError) {
        console.error('Error fetching system resources:', systemError);
      }
      if (therapistAllError) {
        console.error('Error fetching therapist_all resources:', therapistAllError);
      }

      // Combine results
      const mainResources = [
        ...(systemResources || []),
        ...(therapistAllResources || [])
      ];

      if (systemError && therapistAllError) {
        throw systemError; // Throw first error if both fail
      }

      console.log('Main resources fetched:', mainResources?.length || 0);

      let allResourcesList = [...(mainResources || [])];

      // If student has a linked therapist, also fetch their attached-only resources
      if (linkedTherapist?.therapist_id) {
        console.log('Fetching attached resources for therapist:', linkedTherapist.therapist_id);
        const { data: attachedResources, error: attachedError } = await supabase
          .from('resources')
          .select('*')
          .eq('visibility_scope', 'therapist_attached')
          .eq('therapist_id', linkedTherapist.therapist_id)
          .order('created_at', { ascending: false });

        if (attachedError) {
          console.error('Error fetching attached resources:', attachedError);
          // Don't throw - just log and continue with main resources
        } else if (attachedResources) {
          console.log('Attached resources fetched:', attachedResources.length);
          allResourcesList = [...allResourcesList, ...attachedResources];
        }
      }

      console.log('Total resources:', allResourcesList.length);
      setAllResources(allResourcesList);
    } catch (err) {
      console.error('Error fetching resources:', err);
      setError(`Failed to load resources: ${err.message || 'Unknown error'}. Please refresh the page.`);
      setAllResources([]);
    } finally {
      setLoading(false);
    }
  }, [user, linkedTherapist]);

  // Fetch assessment, therapist, and medium-risk status first, then resources
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      await Promise.all([
        fetchAssessment(),
        fetchLinkedTherapist(),
        fetchMediumRiskStatus()
      ]);
    };

    loadData();
  }, [user, fetchAssessment, fetchLinkedTherapist, fetchMediumRiskStatus]);

  // Fetch resources after linkedTherapist is determined (even if null)
  useEffect(() => {
    if (user) {
      // Small delay to ensure linkedTherapist state is updated
      const timer = setTimeout(() => {
        fetchResources();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, linkedTherapist, fetchResources]);

  // Prioritize resources based on assessment data
  const prioritizedResources = useMemo(() => {
    if (!assessment?.challenges || assessment.challenges.length === 0) {
      // No assessment data - return resources as-is
      return {
        recommended: [],
        general: allResources,
        therapist: []
      };
    }

    // Normalize assessment challenges to lowercase for matching
    const studentConcerns = (assessment.challenges || []).map(c => c.toLowerCase());

    // Categorize resources
    const recommended = [];
    const general = [];
    const therapist = [];

    allResources.forEach(resource => {
      // Check if resource tags match student concerns
      const resourceTags = (resource.tags || []).map(t => t.toLowerCase());
      const hasMatchingTag = resourceTags.some(tag => 
        studentConcerns.some(concern => 
          concern.includes(tag) || tag.includes(concern)
        )
      );

      // Categorize by visibility scope
      if (resource.visibility_scope === 'therapist_attached') {
        therapist.push(resource);
      } else if (hasMatchingTag) {
        recommended.push(resource);
      } else {
        general.push(resource);
      }
    });

    return { recommended, general, therapist };
  }, [allResources, assessment]);

  const getResourceIcon = (resource) => {
    if (resource.link) {
      const lt = getLinkType(resource.link);
      if (lt === 'youtube' || lt === 'vimeo') return <FaVideo size={18} />;
      return <FaExternalLinkAlt size={18} />;
    }
    const isVideo =
      resource.content?.toLowerCase().includes('video') ||
      resource.title?.toLowerCase().includes('video');
    if (isVideo) return <FaVideo size={18} />;
    return <FaBookOpen size={18} />;
  };

  const getTagStyle = (tag) => {
    const key = (tag || '').toLowerCase().replace(/\s+/g, '_');
    const colors = TAG_COLORS[key] || TAG_COLORS.default;
    return { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border };
  };

  const isTherapistResource = (resource) =>
    resource.visibility_scope === 'therapist_all' || resource.visibility_scope === 'therapist_attached';

  const filterResources = useCallback((resources) => {
    let filtered = resources;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.title || '').toLowerCase().includes(q) ||
          (r.content || '').toLowerCase().includes(q) ||
          (r.tags || []).some((t) => String(t).toLowerCase().includes(q))
      );
    }
    if (activeFilter !== 'All') {
      const filterLower = activeFilter.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.tags || []).some((t) => String(t).toLowerCase().includes(filterLower)) ||
          (r.category || '').toLowerCase().includes(filterLower)
      );
    }
    return filtered;
  }, [searchQuery, activeFilter]);

  const renderResourceCard = (resource) => {
    const preview = resource.content
      ? (resource.content.length > 200 ? `${resource.content.substring(0, 200)}...` : resource.content)
      : '';
    const source = isTherapistResource(resource) ? 'therapist' : 'system';
    const cardContent = (
      <>
        <div className="resource-header">
          <div className="resource-icon">{getResourceIcon(resource)}</div>
          <h3 className="resource-title">{resource.title || 'Untitled'}</h3>
        </div>
        {resource.tags && resource.tags.length > 0 && (
          <div className="resource-tags">
            {resource.tags.map((tag, idx) => (
              <span key={idx} className="tag" style={getTagStyle(tag)}>
                {tag}
              </span>
            ))}
          </div>
        )}
        {preview && <p className="resource-preview">{preview}</p>}
        {resource.link && (
          <div
            className="resource-media-section"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
          >
            <VideoEmbed url={resource.link} title={resource.title} />
          </div>
        )}
        <div className="card-footer">
          <span className={`source-badge ${source}`}>
            {source === 'therapist' ? '🩺 Therapist Resource' : '⚙️ System Resource'}
          </span>
          <span className="view-btn">
            {!resource.link
              ? '—'
              : getLinkType(resource.link) === 'external'
                ? 'Open link →'
                : 'Watch above'}
          </span>
        </div>
      </>
    );

    const linkType = resource.link ? getLinkType(resource.link) : null;
    const cardOpensExternal = linkType === 'external';

    const card = (
      <div
        key={resource.id}
        className={`resource-card ${isTherapistResource(resource) ? 'therapist-resource' : ''}`}
        onClick={() => {
          if (resource.link && cardOpensExternal) {
            window.open(resource.link, '_blank', 'noopener,noreferrer');
          }
        }}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && resource.link && cardOpensExternal) {
            e.preventDefault();
            window.open(resource.link, '_blank', 'noopener,noreferrer');
          }
        }}
        role={cardOpensExternal ? 'button' : undefined}
        tabIndex={cardOpensExternal ? 0 : undefined}
      >
        {cardContent}
      </div>
    );

    return card;
  };

  if (loading) {
    return (
      <div className="resource-view-container">
        <div className="loading-state">Loading resources...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="resource-view-container">
        <div className="error-banner">{error}</div>
      </div>
    );
  }

  const renderSection = (title, subtitle, resources) => {
    const filtered = filterResources(resources);
    if (filtered.length === 0) return null;
    return (
      <section className="resource-section">
        <div className="section-heading">
          <h2 className="section-title">{title}</h2>
        </div>
        <p className="section-subtitle">{subtitle}</p>
        <div className="resources-grid">
          {filtered.map(renderResourceCard)}
        </div>
      </section>
    );
  };

  return (
    <div className="resource-view-container">
      <div className="page-header">
        <h1 className="page-title">Support Resources</h1>
        <p className="page-subtitle">A library of articles, videos, and tools to support your well-being journey.</p>
      </div>

      {allResources.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h2>Resources Coming Soon</h2>
          <p>Our therapists are curating helpful resources for you. Check back soon for articles, videos, and tools to support your well-being.</p>
        </div>
      ) : (
        <>
          <div className="resources-toolbar">
            <input
              type="text"
              placeholder="🔍 Search resources..."
              className="resource-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="filter-chips">
              {FILTER_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`chip ${activeFilter === cat ? 'active' : ''}`}
                  onClick={() => setActiveFilter(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {hasMediumRiskJournal ? (
            renderSection(
              '✨ Recommended for You',
              'Resources that may help based on your recent journal entries',
              allResources
            )
          ) : (
            <>
              {prioritizedResources.recommended.length > 0 &&
                renderSection(
                  '✨ Recommended for You',
                  'Resources that match your areas of interest',
                  prioritizedResources.recommended
                )}
              {prioritizedResources.therapist.length > 0 &&
                renderSection(
                  '👤 Your Therapist\'s Resources',
                  'Resources shared specifically with you',
                  prioritizedResources.therapist
                )}
              {prioritizedResources.general.length > 0 &&
                renderSection(
                  '📚 General Resources',
                  'Helpful resources available to all students',
                  prioritizedResources.general
                )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ResourceView;

