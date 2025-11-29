import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import './ManageChangeRequestsPage.css';

const ManageChangeRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [action, setAction] = useState(''); // 'approve' or 'reject'
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch change requests
      let query = supabase
        .from('therapist_change_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: requestsData, error: fetchError } = await query;

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        setError(fetchError.message || 'Failed to load change requests.');
        setLoading(false);
        return;
      }

      // Fetch therapist details for each request
      // Note: We can't query auth.users directly from client, so we'll show IDs for students
      const enrichedRequests = await Promise.all(
        (requestsData || []).map(async (request) => {
          // Fetch current therapist info
          let therapistData = null;
          try {
            const { data, error } = await supabase
              .from('therapist_profiles')
              .select('full_name, email')
              .eq('user_id', request.current_therapist_id)
              .single();
            
            if (!error && data) {
              therapistData = data;
            }
          } catch (err) {
            console.error('Error fetching therapist data:', err);
            // Continue with null therapistData
          }

          return {
            ...request,
            student_id_display: request.student_id.substring(0, 8) + '...', // Show partial ID
            current_therapist_name: therapistData?.full_name || 'N/A',
            current_therapist_email: therapistData?.email || 'N/A',
            processed_by_id_display: request.processed_by 
              ? request.processed_by.substring(0, 8) + '...' 
              : null
          };
        })
      );

      setRequests(enrichedRequests);
    } catch (err) {
      console.error('Error fetching change requests:', err);
      setError(`Failed to load change requests: ${err.message || 'Unknown error'}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (request, actionType) => {
    setSelectedRequest(request);
    setAction(actionType);
    setAdminNotes('');
    setIsModalOpen(true);
  };

  const handleProcessRequest = async () => {
    if (!selectedRequest) return;

    try {
      setProcessing(true);
      setError('');

      // Get current admin user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to process requests.');
        return;
      }

      const newStatus = action === 'approve' ? 'approved' : 'rejected';

      // Update the request
      const { data: updatedData, error: updateError } = await supabase
        .from('therapist_change_requests')
        .update({
          status: newStatus,
          processed_at: new Date().toISOString(),
          processed_by: user.id,
          admin_notes: adminNotes.trim() || null
        })
        .eq('id', selectedRequest.id)
        .select();

      if (updateError) {
        console.error('Error updating request:', updateError);
        console.error('Error details:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        });
        setError(`Failed to ${action} request: ${updateError.message || 'Unknown error'}. Please try again.`);
        setProcessing(false);
        return;
      }

      if (!updatedData || updatedData.length === 0) {
        setError('Request updated but could not verify. Please refresh the page.');
        setProcessing(false);
        return;
      }

      // If approved, update the therapist_student_relations table
      if (action === 'approve') {
        // First, remove the old relationship
        const { error: deleteError } = await supabase
          .from('therapist_student_relations')
          .delete()
          .eq('student_id', selectedRequest.student_id);

        if (deleteError) {
          console.error('Error removing old relationship:', deleteError);
          // Continue anyway - the request is still processed
        }

        // Note: The new therapist relationship would be created elsewhere
        // (e.g., when student selects a new therapist)
      }

      // Refresh the list
      await fetchRequests();
      setIsModalOpen(false);
      setSelectedRequest(null);
      setAdminNotes('');
    } catch (err) {
      console.error('Error processing request:', err);
      setError(`Failed to ${action} request: ${err.message || 'Unknown error'}.`);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'status-badge pending';
      case 'approved':
        return 'status-badge approved';
      case 'rejected':
        return 'status-badge rejected';
      case 'in_progress':
        return 'status-badge in-progress';
      default:
        return 'status-badge';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="manage-change-requests-page">
        <div className="loading-container">
          <p>Loading change requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-change-requests-page">
      <div className="page-header">
        <h1>Therapist Change Requests</h1>
        <p>Review and process student requests to change their assigned therapist.</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="filters-container">
        <div className="status-filters">
          <button
            className={statusFilter === 'all' ? 'active' : ''}
            onClick={() => setStatusFilter('all')}
          >
            All
          </button>
          <button
            className={statusFilter === 'pending' ? 'active' : ''}
            onClick={() => setStatusFilter('pending')}
          >
            Pending
          </button>
          <button
            className={statusFilter === 'approved' ? 'active' : ''}
            onClick={() => setStatusFilter('approved')}
          >
            Approved
          </button>
          <button
            className={statusFilter === 'rejected' ? 'active' : ''}
            onClick={() => setStatusFilter('rejected')}
          >
            Rejected
          </button>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="empty-state">
          <p>No change requests found.</p>
        </div>
      ) : (
        <div className="requests-table-container">
          <table className="requests-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Current Therapist</th>
                <th>Reason</th>
                <th>Requested</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <div className="student-info">
                      <strong>Student ID:</strong>
                      <span className="email">{request.student_id_display}</span>
                    </div>
                  </td>
                  <td>
                    <div className="therapist-info">
                      <strong>{request.current_therapist_name}</strong>
                      <span className="email">{request.current_therapist_email}</span>
                    </div>
                  </td>
                  <td>
                    <div className="reason-text">{request.reason}</div>
                  </td>
                  <td>{formatDate(request.requested_at)}</td>
                  <td>
                    <span className={getStatusBadgeClass(request.status)}>
                      {request.status}
                    </span>
                  </td>
                  <td>
                    {request.status === 'pending' ? (
                      <div className="action-buttons">
                        <button
                          className="btn-approve"
                          onClick={() => handleActionClick(request, 'approve')}
                        >
                          Approve
                        </button>
                        <button
                          className="btn-reject"
                          onClick={() => handleActionClick(request, 'reject')}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div className="processed-info">
                        <span>Processed by: {request.processed_by_id_display || 'N/A'}</span>
                        {request.processed_at && (
                          <span className="processed-date">
                            {formatDate(request.processed_at)}
                          </span>
                        )}
                        {request.admin_notes && (
                          <div className="admin-notes">
                            <strong>Notes:</strong> {request.admin_notes}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for processing requests */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !processing && setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{action === 'approve' ? 'Approve' : 'Reject'} Change Request</h2>
              <button
                className="modal-close-btn"
                onClick={() => !processing && setIsModalOpen(false)}
                disabled={processing}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="request-summary">
                <p><strong>Student ID:</strong> {selectedRequest?.student_id_display}</p>
                <p><strong>Current Therapist:</strong> {selectedRequest?.current_therapist_name} ({selectedRequest?.current_therapist_email})</p>
                <p><strong>Reason:</strong> {selectedRequest?.reason}</p>
              </div>
              <div className="form-group">
                <label htmlFor="adminNotes">
                  Admin Notes {action === 'reject' && '(Optional)'}
                </label>
                <textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={action === 'approve' 
                    ? 'Add notes about this approval...' 
                    : 'Add notes explaining the rejection...'}
                  rows={4}
                  disabled={processing}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => !processing && setIsModalOpen(false)}
                disabled={processing}
              >
                Cancel
              </button>
              <button
                className={action === 'approve' ? 'btn-confirm-approve' : 'btn-confirm-reject'}
                onClick={handleProcessRequest}
                disabled={processing}
              >
                {processing ? 'Processing...' : action === 'approve' ? 'Approve Request' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageChangeRequestsPage;

