import React from 'react';
import ResourceManagement from '../Resources/ResourceManagement';

/**
 * ManageResourcesPage Component (Therapist)
 * Wrapper for ResourceManagement component
 */
const ManageResourcesPage = () => {
  return <ResourceManagement userRole="therapist" />;
};

export default ManageResourcesPage;
