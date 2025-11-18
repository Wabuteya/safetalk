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

  // Fetch therapists from database on component mount
  useEffect(() => {
    fetchTherapists();
  }, []);

  const fetchTherapists = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('therapist_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map database data to display format
      const mappedTherapists = (data || []).map(profile => ({
        id: profile.user_id,
        name: profile.full_name || 'N/A',
        email: profile.email || 'N/A',
        dateAdded: profile.created_at ? new Date(profile.created_at).toISOString().slice(0, 10) : 'N/A',
        status: profile.is_live ? 'Active' : 'Pending Setup'
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
      // Generate a temporary password (user will reset it via email)
      const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
      
      // Create the user account with therapist role
      // Supabase will automatically send the confirmation email
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: newTherapist.email,
        password: tempPassword,
        options: {
          data: {
            role: 'therapist',
            full_name: newTherapist.name,
          },
          // This tells Supabase where to send the user AFTER they click the email link
          emailRedirectTo: `${window.location.origin}/therapist-dashboard/profile`
        }
      });

      if (signUpError) {
        // If user already exists, send password reset email instead
        if (signUpError.message.includes('already registered') || signUpError.message.includes('already been registered')) {
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(newTherapist.email, {
            redirectTo: `${window.location.origin}/update-password`
          });
          
          if (resetError) throw resetError;
          setSuccess(`Password reset email sent to ${newTherapist.email}. They can use the link to set up their account.`);
        } else {
          throw signUpError;
        }
      } else {
        // Create a profile entry in therapist_profiles table
        if (data?.user) {
          // Wait a moment to ensure the user is fully committed to auth.users
          // This prevents foreign key constraint errors
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Retry logic for creating the profile (in case of timing issues)
          let profileError = null;
          let retries = 3;
          
          while (retries > 0) {
            const { error } = await supabase.from('therapist_profiles').upsert({
              user_id: data.user.id,
              full_name: newTherapist.name,
              email: newTherapist.email,
              is_live: false
            }, {
              onConflict: 'user_id'
            });

            if (!error) {
              profileError = null;
              break;
            }

            profileError = error;
            
            // If it's a foreign key error, wait and retry
            if (error.code === '23503') {
              retries--;
              if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
              }
            } else {
              // For other errors, don't retry
              break;
            }
          }

          if (profileError) {
            console.error('Error creating therapist profile:', profileError);
            // If it's still a foreign key error after retries, the user might not be in auth.users yet
            // This can happen if email confirmation is required - the user won't exist until they confirm
            if (profileError.code === '23503') {
              setSuccess(`Invitation email sent to ${newTherapist.email}. Note: Profile will be created automatically when they confirm their email.`);
            } else {
              // Don't throw - user was created, profile can be fixed later
              setSuccess(`Invitation email sent to ${newTherapist.email}. Profile creation had an issue but can be fixed later.`);
            }
          } else {
            setSuccess(`Invitation email sent to ${newTherapist.email}. They should check their inbox (and spam folder) to complete registration.`);
          }
        }
      }

      // Refresh the therapists list from database
      await fetchTherapists();

      setIsModalOpen(false);
      setNewTherapist({ name: '', email: '' });
    } catch (error) {
      console.error('Error sending invitation:', error);
      let errorMessage = error?.error_description || error?.message || 'Failed to send invitation. Please try again.';
      
      // Provide more helpful error messages
      if (errorMessage.includes('email') || errorMessage.includes('confirmation')) {
        errorMessage = `Error sending invitation email.\n\nSupabase Error: ${errorMessage}\n\nPlease check:\n1. Email confirmations are enabled in Supabase\n2. Site URL is set correctly\n3. Email templates are configured\n\nCheck browser console (F12) for detailed error.`;
      }
      
      setError(errorMessage);
    } finally {
      setSending(false);
    }
  };

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
        <h1>Manage Therapists</h1>
        <button className="admin-add-new-btn" onClick={() => setIsModalOpen(true)}>+ Add New Therapist</button>
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

      <div className="admin-table-container">
        {therapists.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            <p>No therapists found. Add your first therapist using the button above.</p>
          </div>
        ) : (
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
                    <button 
                      className="action-btn edit" 
                      onClick={() => handleResetPassword(therapist.email)}
                    >
                      Reset Password
                    </button>
                    <button className="action-btn delete">Deactivate</button>
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