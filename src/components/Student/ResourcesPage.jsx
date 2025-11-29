import React, { useState } from 'react';
import './ResourcesPage.css';

const ResourcesPage = () => {
  // No dummy data - will fetch from backend when implemented
  const [resources] = useState([]);

  return (
    <div className="resources-layout">
      <div className="page-header">
        <h1>Motivational Resources</h1>
        <p>A library of articles, videos, and tools curated by our university therapists to support your well-being.</p>
      </div>

      {resources.length === 0 ? (
        <div className="empty-resources-state">
          <div className="empty-resources-icon">📚</div>
          <h2>Resources Coming Soon</h2>
          <p>Our therapists are curating helpful resources for you. Check back soon for articles, videos, and tools to support your well-being.</p>
        </div>
      ) : (
        <>
          <div className="filter-bar">
            {/* Filters will appear here when resources are available */}
          </div>
          <div className="resources-grid">
            {/* Resources will appear here when available */}
          </div>
        </>
      )}
    </div>
  );
};

export default ResourcesPage;