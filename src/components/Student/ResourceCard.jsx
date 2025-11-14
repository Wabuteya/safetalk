import React from 'react';
import './ResourcesPage.css'; // We'll share the CSS file

const ResourceCard = ({ resource }) => {
  return (
    <a href={resource.link} target="_blank" rel="noopener noreferrer" className="resource-card-link">
      <div className="resource-card">
        <div className="resource-image-container">
          <img src={resource.imageUrl} alt={resource.title} className="resource-image" />
          <span className="resource-type-badge">{resource.type}</span>
        </div>
        <div className="resource-content">
          <span className="resource-category-tag">{resource.category}</span>
          <h3 className="resource-title">{resource.title}</h3>
          <p className="resource-description">{resource.description}</p>
        </div>
      </div>
    </a>
  );
};

export default ResourceCard;