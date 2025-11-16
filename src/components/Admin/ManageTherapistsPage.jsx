import React, { useState } from 'react';
import './ManageTherapistsPage.css'; // A dedicated CSS file for this component

// MOCK DATA for the list of therapists
const initialTherapists = [
  { id: 'therapist-01', name: 'Dr. Evelyn Reed', email: 'e.reed@university.edu', dateAdded: '2025-10-01', status: 'Active' },
  { id: 'therapist-02', name: 'Dr. Samuel Chen', email: 's.chen@university.edu', dateAdded: '2025-10-05', status: 'Active' },
  { id: 'therapist-03', name: 'Dr. Maria Garcia', email: 'm.garcia@university.edu', dateAdded: '2025-11-15', status: 'Pending Setup' },
];

const ManageTherapistsPage = () => {
  const [therapists, setTherapists] = useState(initialTherapists);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTherapist, setNewTherapist] = useState({ name: '', email: '' });

  const handleInputChange = (e) => {
    setNewTherapist({ ...newTherapist, [e.target.name]: e.target.value });
  };
  
  const handleAddTherapist = (e) => {
    e.preventDefault();
    // This is where the API call to the backend would happen.
    // The backend would handle sending the welcome email with the secure link.
    console.log('Creating new therapist:', newTherapist);
    alert(`An invitation email has been sent to ${newTherapist.email}.`);
    
    // Add the new therapist to our mock list with "Pending Setup" status
    setTherapists([...therapists, {
      id: `therapist-${Date.now()}`,
      ...newTherapist,
      dateAdded: new Date().toISOString().slice(0, 10),
      status: 'Pending Setup'
    }]);

    setIsModalOpen(false);
    setNewTherapist({ name: '', email: '' });
  };

  return (
    <div className="manage-therapists-layout">
      {/* --- ADD THERAPIST MODAL --- */}
      {isModalOpen && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-content">
            <h2>Add New Therapist</h2>
            <p>Enter the therapist's full name and official university email. The system will send them a welcome email with a secure link to set up their password.</p>
            <form onSubmit={handleAddTherapist}>
              <div className="admin-form-group">
                <label htmlFor="name">Full Name</label>
                <input type="text" id="name" name="name" value={newTherapist.name} onChange={handleInputChange} required />
              </div>
              <div className="admin-form-group">
                <label htmlFor="email">University Email</label>
                <input type="email" id="email" name="email" value={newTherapist.email} onChange={handleInputChange} required />
              </div>
              <div className="admin-modal-actions">
                <button type="button" onClick={() => setIsModalOpen(false)} className="admin-btn cancel">Cancel</button>
                <button type="submit" className="admin-btn confirm">Send Invitation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="admin-page-header">
        <h1>Manage Therapists</h1>
        <button className="admin-add-new-btn" onClick={() => setIsModalOpen(true)}>+ Add New Therapist</button>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Date Added</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {therapists.map(therapist => (
              <tr key={therapist.id}>
                <td>{therapist.name}</td>
                <td>{therapist.email}</td>
                <td>{therapist.dateAdded}</td>
                <td><span className={`status-badge status-${therapist.status.toLowerCase().replace(' ', '-')}`}>{therapist.status}</span></td>
                <td className="actions-cell">
                  <button className="action-btn edit">Reset Password</button>
                  <button className="action-btn delete">Deactivate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageTherapistsPage;