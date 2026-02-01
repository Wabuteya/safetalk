import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../contexts/UserContext';
import { FaExternalLinkAlt, FaBook, FaVideo, FaFileAlt } from 'react-icons/fa';
import './ResourceView.css';

/**
 * ResourceView Component
 * Displays resources for students with intelligent filtering and prioritization
 */
const ResourceView = () => {
  const { user } = useUser();
  const [allResources, setAllResources] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [linkedTherapist, setLinkedTherapist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  // Fetch assessment and therapist first, then resources
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      // Fetch assessment and therapist in parallel
      await Promise.all([
        fetchAssessment(),
        fetchLinkedTherapist()
      ]);
    };

    loadData();
  }, [user, fetchAssessment, fetchLinkedTherapist]);

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
      return <FaExternalLinkAlt />;
    }
    if (resource.content?.toLowerCase().includes('video') || resource.title?.toLowerCase().includes('video')) {
      return <FaVideo />;
    }
    return <FaFileAlt />;
  };

  const renderResourceCard = (resource) => (
    <div key={resource.id} className="resource-card">
      <div className="resource-header">
        <div className="resource-icon">{getResourceIcon(resource)}</div>
        <h3>{resource.title}</h3>
      </div>
      {resource.tags && resource.tags.length > 0 && (
        <div className="resource-tags">
          {resource.tags.map((tag, idx) => (
            <span key={idx} className="tag">{tag}</span>
          ))}
        </div>
      )}
      {resource.content && (
        <div className="resource-content">
          <p>{resource.content.length > 200 ? `${resource.content.substring(0, 200)}...` : resource.content}</p>
        </div>
      )}
      {resource.link && (
        <a
          href={resource.link}
          target="_blank"
          rel="noopener noreferrer"
          className="resource-link"
        >
          <FaExternalLinkAlt /> Open Resource
        </a>
      )}
      <div className="resource-footer">
        <span className="resource-type">
          {resource.visibility_scope === 'system' && 'System Resource'}
          {resource.visibility_scope === 'therapist_all' && 'Therapist Resource'}
          {resource.visibility_scope === 'therapist_attached' && 'Your Therapist\'s Resource'}
        </span>
      </div>
    </div>
  );

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

  return (
    <div className="resource-view-container">
      <div className="page-header">
        <h1>Support Resources</h1>
        <p>A library of articles, videos, and tools to support your well-being journey.</p>
      </div>

      {allResources.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h2>Resources Coming Soon</h2>
          <p>Our therapists are curating helpful resources for you. Check back soon for articles, videos, and tools to support your well-being.</p>
        </div>
      ) : (
        <>
          {/* Recommended Resources (if assessment exists) */}
          {prioritizedResources.recommended.length > 0 && (
            <section className="resource-section">
              <h2 className="section-title">✨ Recommended for You</h2>
              <p className="section-description">Resources that match your areas of interest</p>
              <div className="resources-grid">
                {prioritizedResources.recommended.map(renderResourceCard)}
              </div>
            </section>
          )}

          {/* Therapist Resources (if attached) */}
          {prioritizedResources.therapist.length > 0 && (
            <section className="resource-section">
              <h2 className="section-title">👤 Your Therapist's Resources</h2>
              <p className="section-description">Resources shared specifically with you</p>
              <div className="resources-grid">
                {prioritizedResources.therapist.map(renderResourceCard)}
              </div>
            </section>
          )}

          {/* General Resources */}
          {prioritizedResources.general.length > 0 && (
            <section className="resource-section">
              <h2 className="section-title">📚 General Resources</h2>
              <p className="section-description">Helpful resources available to all students</p>
              <div className="resources-grid">
                {prioritizedResources.general.map(renderResourceCard)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default ResourceView;

