import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import './ManageTherapistsPage.css';

const ManageTherapistsPage = () => {
  const [therapists, setTherapists] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTherapist, setNewTherapist] = useState({ name: '', email: '' });
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch therapists from database on component mount
  useEffect(() => {
    fetchTherapists();
  }, []);

  const fetchTherapists = async () => {
    try {
      setLoading(true);
      const [profilesResult, relationsResult] = await Promise.all([
        supabase
          .from('therapist_profiles')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('therapist_student_relations')
          .select('therapist_id')
      ]);

      const { data: profiles, error } = profilesResult;
      if (error) throw error;

      // Build caseload count map
      const caseloadMap = new Map();
      (relationsResult.data || []).forEach(rel => {
        caseloadMap.set(rel.therapist_id, (caseloadMap.get(rel.therapist_id) || 0) + 1);
      });

      // Map database data to display format
      const mappedTherapists = (profiles || []).map(profile => ({
        id: profile.user_id,
        name: profile.full_name || 'N/A',
        email: profile.email || 'N/A',
        dateAdded: profile.created_at ? new Date(profile.created_at).toISOString() : null,
        status: profile.is_live ? 'Active' : 'Inactive',
        studentCount: caseloadMap.get(profile.user_id) || 0
      }));

      setTherapists(mappedTherapists);
    } catch (error) {
      console.error('Error fetching therapists:', error);
      setError('Failed to load therapists. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setNewTherapist({ ...newTherapist, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };
  
  const handleAddTherapist = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    setSuccess('');

    try {
      // --- THIS IS THE CORRECTED CALL ---
      const { data, error } = await supabase.functions.invoke('invite-therapist', {
        headers: {
          'Content-Type': 'application/json', // This line is the fix
        },
        body: JSON.stringify({ // We must also stringify the body
          email: newTherapist.email,
          full_name: newTherapist.name 
        }),
      });

      if (error) {
        // When Edge Function returns non-2xx, the actual error message is in the response body
        // The data object contains the error message from the Edge Function
        console.error('Edge Function error response:', { data, error });
        
        // Extract error message from response body (data.error) or error object
        const actualError = data?.error || error.message || error.error_description || 'Unknown error';
        throw new Error(actualError);
      }
      
      // The Edge Function handles user creation and profile creation
      // Refresh the therapists list from database
      await fetchTherapists();

      setSuccess(data?.message || `Invitation successfully sent to ${newTherapist.email}!`);
    setIsModalOpen(false);
    setNewTherapist({ name: '', email: '' });
    } catch (error) {
      console.error('Error sending invitation:', error);
      console.error('Full error object:', error);
      
      // Extract error message from various possible locations
      // When Edge Function returns 400, the error message is usually in error.message
      let errorMessage = error?.message || error?.error_description || error?.error || 'Failed to send invitation. Please try again.';
      
      // Common Edge Function errors and their fixes
      if (errorMessage.includes('non-2xx') || errorMessage.includes('Edge Function')) {
        // Try to get the actual error from the response
        // The actual error might be logged in console above
        errorMessage = 'The invitation service encountered an error.\n\nCommon causes:\n1. Edge Function not deployed - Deploy it: npx supabase functions deploy invite-therapist\n2. Missing environment variables - Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY\n3. User already exists\n4. Email service not configured\n\nCheck the browser console above for the actual error message.';
      }
      
      // Handle specific error messages from Edge Function
      if (errorMessage.includes('already registered') || errorMessage.includes('already exists') || errorMessage.includes('User already registered')) {
        errorMessage = `A user with email ${newTherapist.email} already exists.\n\nYou can:\n1. Use the "Reset Password" button in the therapists table\n2. Or they can use "Forgot Password" on the login page`;
      } else if (errorMessage.includes('email') || errorMessage.includes('confirmation')) {
        errorMessage = `Error sending invitation email.\n\nError: ${errorMessage}\n\nPlease check:\n1. Email confirmations are enabled in Supabase Dashboard\n2. Site URL is set correctly in Authentication settings\n3. Email templates are configured\n4. SMTP is properly set up (or using default Supabase email)`;
      } else if (errorMessage.includes('environment') || errorMessage.includes('SUPABASE_URL') || errorMessage.includes('SERVICE_ROLE_KEY')) {
        errorMessage = `Edge Function configuration error.\n\nError: ${errorMessage}\n\nPlease check:\n1. Go to Supabase Dashboard → Edge Functions → invite-therapist\n2. Verify environment variables are set:\n   - SUPABASE_URL\n   - SUPABASE_SERVICE_ROLE_KEY\n3. Redeploy the function if needed`;
      }
      
      setError(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const capitalizeName = (str) => {
    if (!str || str === 'N/A') return str;
    return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  const formatDateAdded = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredTherapists = therapists.filter(t => {
    const matchesSearch = !searchTerm || 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && t.status === 'Active') ||
      (statusFilter === 'inactive' && t.status === 'Inactive');
    return matchesSearch && matchesStatus;
  });

  const handleResetPassword = async (email) => {
    if (!confirm(`Send a password reset email to ${email}?`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`
      });

      if (error) throw error;
      setSuccess(`Password reset email sent to ${email}.`);
    } catch (error) {
      console.error('Error sending password reset:', error);
      setError(error.message || 'Failed to send password reset email.');
    }
  };

  const handleDeactivateTherapist = async (therapistId) => {
    if (!confirm('Are you sure you want to deactivate this therapist? They will no longer appear in the student therapist finder or assignment dropdown.')) return;
    try {
      setError('');
      const { error } = await supabase
        .from('therapist_profiles')
        .update({ is_live: false })
        .eq('user_id', therapistId);
      if (error) throw error;
      setSuccess('Therapist deactivated.');
      await fetchTherapists();
    } catch (err) {
      console.error('Error deactivating therapist:', err);
      setError(err.message || 'Failed to deactivate therapist.');
    }
  };

  const handleReactivateTherapist = async (therapistId) => {
    if (!confirm('Are you sure you want to reactivate this therapist?')) return;
    try {
      setError('');
      const { error } = await supabase
        .from('therapist_profiles')
        .update({ is_live: true })
        .eq('user_id', therapistId);
      if (error) throw error;
      setSuccess('Therapist reactivated.');
      await fetchTherapists();
    } catch (err) {
      console.error('Error reactivating therapist:', err);
      setError(err.message || 'Failed to reactivate therapist.');
    }
  };

  if (loading) {
    return (
      <div className="manage-therapists-layout">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading therapists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-therapists-layout">
      {/* --- ADD THERAPIST MODAL --- */}
      {isModalOpen && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-content">
            <h2>Add New Therapist</h2>
            <p>Enter the therapist's full name and official university email. The system will send them a welcome email with a secure link to set up their password.</p>
            <form onSubmit={handleAddTherapist}>
              {error && (
                <div style={{ 
                  padding: '0.75rem', 
                  marginBottom: '1rem', 
                  backgroundColor: '#f8d7da', 
                  color: '#721c24', 
                  borderRadius: '0.5rem',
                  border: '1px solid #f5c6cb',
                  fontSize: '0.9rem',
                  whiteSpace: 'pre-line'
                }}>
                  {error}
                </div>
              )}
              {success && (
                <div style={{ 
                  padding: '0.75rem', 
                  marginBottom: '1rem', 
                  backgroundColor: '#d4edda', 
                  color: '#155724', 
                  borderRadius: '0.5rem',
                  border: '1px solid #c3e6cb',
                  fontSize: '0.9rem'
                }}>
                  {success}
                </div>
              )}
              <div className="admin-form-group">
                <label htmlFor="name">Full Name</label>
                <input 
                  type="text" 
                  id="name" 
                  name="name" 
                  value={newTherapist.name} 
                  onChange={handleInputChange} 
                  required 
                  disabled={sending}
                />
              </div>
              <div className="admin-form-group">
                <label htmlFor="email">University Email</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  value={newTherapist.email} 
                  onChange={handleInputChange} 
                  required 
                  disabled={sending}
                />
              </div>
              <div className="admin-modal-actions">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsModalOpen(false);
                    setError('');
                    setSuccess('');
                    setNewTherapist({ name: '', email: '' });
                  }} 
                  className="admin-btn cancel"
                  disabled={sending}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="admin-btn confirm"
                  disabled={sending}
                >
                  {sending ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="admin-page-header">
        <h1 className="page-title">Manage Therapists</h1>
        <button className="add-therapist-btn" onClick={() => setIsModalOpen(true)}>+ Add New Therapist</button>
      </div>

      {error && !isModalOpen && (
        <div style={{ 
          padding: '0.75rem', 
          marginBottom: '1rem', 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          borderRadius: '0.5rem',
          border: '1px solid #f5c6cb',
          fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}
      {success && !isModalOpen && (
        <div style={{ 
          padding: '0.75rem', 
          marginBottom: '1rem', 
          backgroundColor: '#d4edda', 
          color: '#155724', 
          borderRadius: '0.5rem',
          border: '1px solid #c3e6cb',
          fontSize: '0.9rem'
        }}>
          {success}
        </div>
      )}

      <div className="table-controls">
        <input
          type="text"
          placeholder="Search by name or email..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="therapists-table-card">
        {filteredTherapists.length === 0 ? (
          <div className="empty-state">
            <p>No therapists found. Add your first therapist using the button above.</p>
          </div>
        ) : (
        <table className="therapists-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Caseload</th>
              <th>Date Added</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTherapists.map(therapist => (
              <tr key={therapist.id}>
                <td>
                  <span className="therapist-name">
                    {capitalizeName(therapist.name)}
                  </span>
                </td>
                <td><span className="therapist-email">{therapist.email}</span></td>
                <td>
                  <span className="caseload-count">
                    {therapist.studentCount ?? 0} students
                  </span>
                </td>
                <td>{formatDateAdded(therapist.dateAdded)}</td>
                <td>
                  <span className={`status-badge status-${therapist.status.toLowerCase()}`}>
                    {therapist.status}
                  </span>
                </td>
                <td className="actions-cell">
                  <button
                    className="reset-password-btn"
                    onClick={() => handleResetPassword(therapist.email)}
                  >
                    Reset Password
                  </button>
                  {therapist.status === 'Active' ? (
                    <button
                      className="deactivate-btn"
                      onClick={() => handleDeactivateTherapist(therapist.id)}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      className="reactivate-btn"
                      onClick={() => handleReactivateTherapist(therapist.id)}
                    >
                      Reactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
};

export default ManageTherapistsPage;