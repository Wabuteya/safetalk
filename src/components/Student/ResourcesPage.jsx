import React, { useState, useMemo } from 'react';
import ResourceCard from './ResourceCard.jsx';
import './ResourcesPage.css';

// MOCK DATA: Curated by therapists
const resourcesData = [
  { id: 1, title: '5-Minute Mindfulness Meditation', type: 'VIDEO', category: 'Mindfulness', description: 'A short, guided meditation to help you find calm and focus during a busy day.', imageUrl: 'https://via.placeholder.com/300x150', link: '#' },
  { id: 2, title: 'Understanding and Managing Anxiety', type: 'ARTICLE', category: 'Anxiety', description: 'An in-depth article explaining the sources of anxiety and practical steps to manage it.', imageUrl: 'https://via.placeholder.com/300x150', link: '#' },
  { id: 3, title: 'The Pomodoro Technique for Studying', type: 'BLOG', category: 'Study Skills', description: 'Learn how to beat procrastination and improve focus with this simple time-management method.', imageUrl: 'https://via.placeholder.com/300x150', link: '#' },
  { id: 4, title: 'Building Healthier Communication Habits', type: 'ARTICLE', category: 'Relationships', description: 'Explore techniques for expressing your needs and listening effectively in your relationships.', imageUrl: 'https://via.placeholder.com/300x150', link: '#' },
  { id: 5, title: 'Yoga for Stress Relief', type: 'VIDEO', category: 'Mindfulness', description: 'A gentle 15-minute yoga flow designed to release tension from your body and mind.', imageUrl: 'https://via.placeholder.com/300x150', link: '#' },
  { id: 6, title: 'How to Cope with Academic Pressure', type: 'BLOG', category: 'Study Skills', description: 'Tips from fellow students and counselors on handling the stress of exams and deadlines.', imageUrl: 'https://via.placeholder.com/300x150', link: '#' },
];

const allCategories = ['All', 'Mindfulness', 'Anxiety', 'Study Skills', 'Relationships'];

const ResourcesPage = () => {
  const [activeFilter, setActiveFilter] = useState('All');

  const filteredResources = useMemo(() => {
    if (activeFilter === 'All') {
      return resourcesData;
    }
    return resourcesData.filter(resource => resource.category === activeFilter);
  }, [activeFilter]);

  return (
    <div className="resources-layout">
      <div className="page-header">
        <h1>Motivational Resources</h1>
        <p>A library of articles, videos, and tools curated by our university therapists to support your well-being.</p>
      </div>

      <div className="filter-bar">
        {allCategories.map(category => (
          <button
            key={category}
            className={`filter-btn ${activeFilter === category ? 'active' : ''}`}
            onClick={() => setActiveFilter(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="resources-grid">
        {filteredResources.map(resource => (
          <ResourceCard key={resource.id} resource={resource} />
        ))}
      </div>
    </div>
  );
};

export default ResourcesPage;