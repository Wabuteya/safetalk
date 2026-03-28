import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import './ManageStudentsPage.css';

const ManageStudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [changeRequestFilter, setChangeRequestFilter] = useState('all');
  const [deletionRequestFilter, setDeletionRequestFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [therapists, setTherapists] = useState([]);
  const [selectedTherapistId, setSelectedTherapistId] = useState('');
  const [isChangeRequestModalOpen, setIsChangeRequestModalOpen] = useState(false);
  const [selectedChangeRequest, setSelectedChangeRequest] = useState(null);
  const [changeRequestAction, setChangeRequestAction] = useState('');
  const [isDeletionRequestModalOpen, setIsDeletionRequestModalOpen] = useState(false);
  const [selectedDeletionRequest, setSelectedDeletionRequest] = useState(null);
  const [deletionDismissFormOpen, setDeletionDismissFormOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Summary statistics
  const [summaryStats, setSummaryStats] = useState({
    total: 0,
    active: 0,
    suspended: 0,
    withoutTherapist: 0,
    pendingChangeRequests: 0,
    pendingDeletionRequests: 0
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch all students with their profiles and assignments
      // Note: account_status and last_login may not exist yet - handle gracefully
      const [profilesResult, relationsResult, changeRequestsResult, deletionRequestsResult] = await Promise.all([
        supabase
          .from('student_profiles')
          .select('user_id, alias, created_at, account_status')
          .order('created_at', { ascending: false }),
        supabase
          .from('therapist_student_relations')
          .select('student_id, therapist_id'),
        supabase
          .from('therapist_change_requests')
          .select('*')
          .eq('status', 'pending'),
        supabase
          .from('account_deletion_requests')
          .select('*')
          .eq('status', 'pending')
      ]);

      // Check all three results for errors
      if (profilesResult.error) {
        console.error('Error fetching student profiles:', profilesResult.error);
        throw profilesResult.error;
      }

      if (relationsResult.error) {
        console.error('Error fetching therapist-student relations:', relationsResult.error);
        // Log error but continue with empty relations - students will show as unassigned
        // This allows partial data display rather than complete failure
      }

      if (changeRequestsResult.error) {
        console.error('Error fetching change requests:', changeRequestsResult.error);
        // Log error but continue with empty change requests - students won't show pending requests
        // This allows partial data display rather than complete failure
      }

      if (deletionRequestsResult.error) {
        console.error('Error fetching account deletion requests:', deletionRequestsResult.error);
      }

      const profiles = profilesResult.data || [];
      const relations = relationsResult.error ? [] : (relationsResult.data || []);
      const pendingRequests = changeRequestsResult.error ? [] : (changeRequestsResult.data || []);
      const pendingDeletionRequests = deletionRequestsResult.error ? [] : (deletionRequestsResult.data || []);

      // Create a map of student_id -> therapist_id
      const assignmentMap = new Map();
      relations.forEach(rel => {
        assignmentMap.set(rel.student_id, rel.therapist_id);
      });

      // Create a map of student_id -> pending request (full object)
      const requestMap = new Map();
      pendingRequests.forEach(req => {
        requestMap.set(req.student_id, req);
      });

      const deletionRequestMap = new Map();
      pendingDeletionRequests.forEach(req => {
        deletionRequestMap.set(req.student_id, req);
      });

      // Fetch last login from auth.users (we'll use created_at as fallback)
      // Note: Supabase doesn't expose last_sign_in_at directly from client
      // We'll use created_at for now, or you can add a last_login field to student_profiles
      const enrichedStudents = profiles.map(profile => {
        const hasTherapist = assignmentMap.has(profile.user_id);
        const pendingRequest = requestMap.get(profile.user_id);
        const pendingDeletion = deletionRequestMap.get(profile.user_id);
        
        // Get account status from database, default to 'active' if not set
        // account_status column may not exist yet - handle gracefully
        const accountStatus = profile.account_status || 'active';

        return {
          id: profile.user_id,
          alias: profile.alias || `Student ${profile.user_id.substring(0, 8)}`,
          accountStatus: accountStatus,
          therapistAssigned: hasTherapist,
          therapistId: hasTherapist ? assignmentMap.get(profile.user_id) : null,
          dateJoined: profile.created_at,
          lastLogin: profile.last_login || profile.created_at, // Use last_login if available, fallback to created_at
          changeRequestStatus: pendingRequest ? 'pending' : 'none',
          changeRequest: pendingRequest || null,
          deletionRequestStatus: pendingDeletion ? 'pending' : 'none',
          deletionRequest: pendingDeletion || null
        };
      });

      setStudents(enrichedStudents);

      // Calculate summary statistics
      const stats = {
        total: enrichedStudents.length,
        active: enrichedStudents.filter(s => s.accountStatus === 'active').length,
        suspended: enrichedStudents.filter(s => s.accountStatus === 'suspended').length,
        withoutTherapist: enrichedStudents.filter(s => !s.therapistAssigned).length,
        pendingChangeRequests: pendingRequests.length,
        pendingDeletionRequests: pendingDeletionRequests.length
      };
      setSummaryStats(stats);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Failed to load students. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered and paginated students
  const filteredStudents = useMemo(() => {
    let filtered = students;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.alias.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(student => student.accountStatus === statusFilter);
    }

    // Assignment filter
    if (assignmentFilter === 'assigned') {
      filtered = filtered.filter(student => student.therapistAssigned);
    } else if (assignmentFilter === 'not-assigned') {
      filtered = filtered.filter(student => !student.therapistAssigned);
    }

    // Change request filter
    if (changeRequestFilter === 'pending') {
      filtered = filtered.filter(student => student.changeRequestStatus === 'pending');
    } else if (changeRequestFilter === 'none') {
      filtered = filtered.filter(student => student.changeRequestStatus === 'none');
    }

    if (deletionRequestFilter === 'pending') {
      filtered = filtered.filter(student => student.deletionRequestStatus === 'pending');
    } else if (deletionRequestFilter === 'none') {
      filtered = filtered.filter(student => student.deletionRequestStatus === 'none');
    }

    return filtered;
  }, [students, searchTerm, statusFilter, assignmentFilter, changeRequestFilter, deletionRequestFilter]);

  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, currentPage]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  // Account actions
  const handleSuspendAccount = async (studentId) => {
    if (!confirm('Are you sure you want to suspend this student account?')) return;
    
    try {
      const { error } = await supabase
        .from('student_profiles')
        .update({ account_status: 'suspended' })
        .eq('user_id', studentId);

      if (error) {
        if (error.code === '42703') {
          alert('Account status feature not available. Please run the database migration first.\n\nSee: student_account_status_schema.sql');
          return;
        }
        throw error;
      }
      
      await fetchStudents();
    } catch (err) {
      console.error('Error suspending account:', err);
      alert('Failed to suspend account. Please try again.');
    }
  };

  const handleReactivateAccount = async (studentId) => {
    if (!confirm('Are you sure you want to reactivate this student account?')) return;
    
    try {
      const { error } = await supabase
        .from('student_profiles')
        .update({ account_status: 'active' })
        .eq('user_id', studentId);

      if (error) {
        if (error.code === '42703') {
          alert('Account status feature not available. Please run the database migration first.\n\nSee: student_account_status_schema.sql');
          return;
        }
        throw error;
      }
      
      await fetchStudents();
    } catch (err) {
      console.error('Error reactivating account:', err);
      alert('Failed to reactivate account. Please try again.');
    }
  };

  const handleDeactivateAccount = async (studentId) => {
    if (!confirm('Are you sure you want to deactivate this student account? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('student_profiles')
        .update({ account_status: 'deactivated' })
        .eq('user_id', studentId);

      if (error) {
        if (error.code === '42703') {
          alert('Account status feature not available. Please run the database migration first.\n\nSee: student_account_status_schema.sql');
          return;
        }
        throw error;
      }
      
      await fetchStudents();
    } catch (err) {
      console.error('Error deactivating account:', err);
      alert('Failed to deactivate account. Please try again.');
    }
  };

  const handleViewAccount = (student) => {
    setSelectedStudent(student);
    setIsViewModalOpen(true);
  };

  const handleAssignTherapist = async (student) => {
    setSelectedStudent(student);
    setSelectedTherapistId('');
    try {
      const { data, error } = await supabase
        .from('therapist_profiles')
        .select('user_id, full_name')
        .eq('is_live', true)
        .order('full_name');
      if (error) throw error;
      setTherapists(data || []);
      setIsAssignModalOpen(true);
    } catch (err) {
      console.error('Error fetching therapists:', err);
      alert('Failed to load therapists. Please try again.');
    }
  };

  const handleConfirmAssign = async () => {
    if (!selectedStudent || !selectedTherapistId) return;
    try {
      const { error } = await supabase
        .from('therapist_student_relations')
        .insert({ student_id: selectedStudent.id, therapist_id: selectedTherapistId });
      if (error) throw error;
      await fetchStudents();
      setIsAssignModalOpen(false);
      setSelectedStudent(null);
      setSelectedTherapistId('');
    } catch (err) {
      console.error('Error assigning therapist:', err);
      alert(err.message || 'Failed to assign therapist. Please try again.');
    }
  };

  const handleChangeRequestAction = (student, request) => {
    setSelectedStudent(student);
    setSelectedChangeRequest(request);
    setChangeRequestAction(''); // Will be set to 'approve' or 'reject'
    setAdminNotes('');
    setIsChangeRequestModalOpen(true);
  };

  const handleDeletionRequestAction = (student, request) => {
    setSelectedStudent(student);
    setSelectedDeletionRequest(request);
    setDeletionDismissFormOpen(false);
    setAdminNotes('');
    setIsDeletionRequestModalOpen(true);
  };

  const handlePermanentDeleteStudent = async () => {
    if (!selectedStudent || !selectedDeletionRequest) return;
    const ok = window.confirm(
      `Permanently delete ${selectedStudent.alias}? This removes their login and related data in the database. This cannot be undone.`
    );
    if (!ok) return;

    try {
      setProcessing(true);
      const { data, error } = await supabase.functions.invoke('admin-delete-student', {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          deletion_request_id: selectedDeletionRequest.id,
        }),
      });

      if (error) {
        const msg = (data && typeof data === 'object' && 'error' in data && data.error) || error.message;
        throw new Error(typeof msg === 'string' ? msg : 'Failed to delete account.');
      }

      await fetchStudents();
      setIsDeletionRequestModalOpen(false);
      setSelectedDeletionRequest(null);
      setSelectedStudent(null);
      setAdminNotes('');
    } catch (err) {
      console.error('Error deleting student account:', err);
      alert(err.message || 'Failed to delete account. Deploy the admin-delete-student edge function if you have not.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDismissDeletionRequest = async () => {
    if (!selectedDeletionRequest) return;

    try {
      setProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to process requests.');
        return;
      }

      const { error: updateError } = await supabase
        .from('account_deletion_requests')
        .update({
          status: 'dismissed',
          processed_at: new Date().toISOString(),
          processed_by: user.id,
          admin_notes: adminNotes.trim() || null
        })
        .eq('id', selectedDeletionRequest.id);

      if (updateError) throw updateError;

      await fetchStudents();
      setIsDeletionRequestModalOpen(false);
      setSelectedDeletionRequest(null);
      setAdminNotes('');
      setDeletionDismissFormOpen(false);
    } catch (err) {
      console.error('Error dismissing account deletion request:', err);
      alert('Failed to dismiss request. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessChangeRequest = async () => {
    if (!selectedChangeRequest || !changeRequestAction) return;

    try {
      setProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to process requests.');
        return;
      }

      const newStatus = changeRequestAction === 'approve' ? 'approved' : 'rejected';

      // Update the change request
      const { error: updateError } = await supabase
        .from('therapist_change_requests')
        .update({
          status: newStatus,
          processed_at: new Date().toISOString(),
          processed_by: user.id,
          admin_notes: adminNotes.trim() || null
        })
        .eq('id', selectedChangeRequest.id);

      if (updateError) throw updateError;

      // If approved, remove old relationship
      if (changeRequestAction === 'approve') {
        const { error: deleteError } = await supabase
          .from('therapist_student_relations')
          .delete()
          .eq('student_id', selectedStudent.id);

        if (deleteError) {
          console.error('Error removing old relationship:', deleteError);
        }
      }

      await fetchStudents();
      setIsChangeRequestModalOpen(false);
      setSelectedChangeRequest(null);
      setAdminNotes('');
    } catch (err) {
      console.error('Error processing change request:', err);
      alert('Failed to process request. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="manage-students-page">
        <div className="loading-container">
          <p>Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-students-page">
      <div className="page-header">
        <h1 className="page-title">Manage Students</h1>
        <p>View and manage all registered student accounts</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Stats Grid - 4 in a row */}
      <div className="stats-grid">
        <div className="stat-card total">
          <p className="stat-value">{summaryStats.total}</p>
          <p className="stat-label">Total Students</p>
        </div>
        <div className="stat-card active">
          <p className="stat-value">{summaryStats.active}</p>
          <p className="stat-label">Active Students</p>
        </div>
        <div className="stat-card suspended">
          <p className="stat-value">{summaryStats.suspended}</p>
          <p className="stat-label">Suspended</p>
        </div>
        <div className="stat-card unassigned">
          <p className="stat-value">{summaryStats.withoutTherapist}</p>
          <p className="stat-label">Without Therapist</p>
        </div>
        <div className="stat-card deletion-pending">
          <p className="stat-value">{summaryStats.pendingDeletionRequests}</p>
          <p className="stat-label">Deletion Requests</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="filters-container table-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by alias..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="search-input"
          />
        </div>
        <div className="filter-group">
          <label>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Therapist Assignment:</label>
          <select
            value={assignmentFilter}
            onChange={(e) => {
              setAssignmentFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="all">All</option>
            <option value="assigned">Assigned</option>
            <option value="not-assigned">Not Assigned</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Therapist change:</label>
          <select
            value={changeRequestFilter}
            onChange={(e) => {
              setChangeRequestFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="none">None</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Account deletion:</label>
          <select
            value={deletionRequestFilter}
            onChange={(e) => {
              setDeletionRequestFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="none">None</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="students-table-card table-container">
        {paginatedStudents.length === 0 ? (
          <div className="empty-state">
            <p>No students found matching your criteria.</p>
          </div>
        ) : (
          <>
            <table className="students-table">
              <thead>
                <tr>
                  <th>Alias</th>
                  <th>Account Status</th>
                  <th>Therapist Assignment</th>
                  <th>Therapist change</th>
                  <th>Deletion</th>
                  <th>Date Joined</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.map((student) => (
                  <tr key={student.id}>
                    <td><span className="student-alias">{student.alias}</span></td>
                    <td>
                      <span className={`status-badge status-${student.accountStatus}`}>
                        {student.accountStatus.charAt(0).toUpperCase() + student.accountStatus.slice(1)}
                      </span>
                    </td>
                    <td>
                      {student.therapistAssigned ? (
                        <span className="assignment-badge assigned">Assigned</span>
                      ) : (
                        <span className="assignment-badge not-assigned">Not Assigned</span>
                      )}
                    </td>
                    <td>
                      {student.changeRequestStatus === 'pending' ? (
                        <span className="change-request-badge pending">Pending</span>
                      ) : (
                        <span className="change-request-badge none">None</span>
                      )}
                    </td>
                    <td>
                      {student.deletionRequestStatus === 'pending' ? (
                        <span className="deletion-request-badge pending">Pending</span>
                      ) : (
                        <span className="deletion-request-badge none">None</span>
                      )}
                    </td>
                    <td>{formatDate(student.dateJoined)}</td>
                    <td>{formatDateTime(student.lastLogin)}</td>
                    <td className="actions-cell">
                      <div className="row-actions">
                        <button
                          className="view-btn"
                          onClick={() => handleViewAccount(student)}
                          title="View Account"
                        >
                          View
                        </button>
                        {!student.therapistAssigned && (
                          <button
                            className="assign-btn"
                            onClick={() => handleAssignTherapist(student)}
                            title="Assign Therapist"
                          >
                            Assign
                          </button>
                        )}
                        {student.accountStatus === 'active' && (
                          <button
                            className="suspend-btn"
                            onClick={() => handleSuspendAccount(student.id)}
                            title="Suspend Account"
                          >
                            Suspend
                          </button>
                        )}
                        {student.accountStatus === 'suspended' && (
                          <button
                            className="reactivate-btn"
                            onClick={() => handleReactivateAccount(student.id)}
                            title="Reactivate Account"
                          >
                            Reactivate
                          </button>
                        )}
                        {student.changeRequestStatus === 'pending' && student.changeRequest && (
                          <button
                            className="action-btn change-request"
                            onClick={() => handleChangeRequestAction(student, student.changeRequest)}
                            title="Handle Change Request"
                          >
                            Change Request
                          </button>
                        )}
                        {student.deletionRequestStatus === 'pending' && student.deletionRequest && (
                          <button
                            className="action-btn deletion-request"
                            onClick={() => handleDeletionRequestAction(student, student.deletionRequest)}
                            title="Handle account deletion request"
                          >
                            Deletion
                          </button>
                        )}
                        <button
                          className="deactivate-btn"
                          onClick={() => handleDeactivateAccount(student.id)}
                          title="Deactivate Account"
                        >
                          Deactivate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {currentPage} of {totalPages} ({filteredStudents.length} students)
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* View Account Modal */}
      {isViewModalOpen && selectedStudent && (
        <div className="modal-overlay" onClick={() => setIsViewModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Student Account Details</h2>
              <button
                className="modal-close-btn"
                onClick={() => setIsViewModalOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="account-details">
                <div className="detail-row">
                  <strong>Alias:</strong>
                  <span>{selectedStudent.alias}</span>
                </div>
                <div className="detail-row">
                  <strong>Account Status:</strong>
                  <span className={`status-badge status-${selectedStudent.accountStatus}`}>
                    {selectedStudent.accountStatus.charAt(0).toUpperCase() + selectedStudent.accountStatus.slice(1)}
                  </span>
                </div>
                <div className="detail-row">
                  <strong>Therapist Assignment:</strong>
                  <span>
                    {selectedStudent.therapistAssigned ? 'Assigned' : 'Not Assigned'}
                  </span>
                </div>
                <div className="detail-row">
                  <strong>Date Joined:</strong>
                  <span>{formatDateTime(selectedStudent.dateJoined)}</span>
                </div>
                <div className="detail-row">
                  <strong>Last Login:</strong>
                  <span>{formatDateTime(selectedStudent.lastLogin)}</span>
                </div>
                <div className="detail-row">
                  <strong>Student ID:</strong>
                  <span className="student-id">{selectedStudent.id}</span>
                </div>
                {selectedStudent.deletionRequestStatus === 'pending' && selectedStudent.deletionRequest && (
                  <div className="detail-row">
                    <strong>Account deletion:</strong>
                    <span className="deletion-request-badge pending">Pending — use Deletion in the table to resolve</span>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-close"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Therapist Modal */}
      {isAssignModalOpen && selectedStudent && (
        <div className="modal-overlay" onClick={() => setIsAssignModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Therapist</h2>
              <button className="modal-close-btn" onClick={() => setIsAssignModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>Student:</strong> {selectedStudent.alias}</p>
              <div className="form-group">
                <label htmlFor="therapist-select">Select Therapist</label>
                <select
                  id="therapist-select"
                  value={selectedTherapistId}
                  onChange={(e) => setSelectedTherapistId(e.target.value)}
                  className="filter-select"
                  style={{ width: '100%', marginTop: '8px' }}
                >
                  <option value="">Choose a therapist...</option>
                  {therapists.map((t) => (
                    <option key={t.user_id} value={t.user_id}>{t.full_name || 'Therapist'}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setIsAssignModalOpen(false)}>Cancel</button>
              <button
                className="btn-confirm-approve"
                onClick={handleConfirmAssign}
                disabled={!selectedTherapistId}
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account deletion request modal */}
      {isDeletionRequestModalOpen && selectedDeletionRequest && selectedStudent && (
        <div className="modal-overlay" onClick={() => !processing && setIsDeletionRequestModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Account deletion request</h2>
              <button
                className="modal-close-btn"
                onClick={() => !processing && setIsDeletionRequestModalOpen(false)}
                disabled={processing}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="request-summary">
                <p><strong>Student:</strong> {selectedStudent.alias}</p>
                {selectedDeletionRequest.reason ? (
                  <p><strong>Reason:</strong> {selectedDeletionRequest.reason}</p>
                ) : (
                  <p><strong>Reason:</strong> <em>None provided</em></p>
                )}
                <p><strong>Requested:</strong> {formatDateTime(selectedDeletionRequest.requested_at)}</p>
                <p className="deletion-modal-hint">
                  <strong>Delete account</strong> removes the student from authentication and clears related rows (profiles, journals, etc.) where the database is set to cascade.
                  Use <strong>Dismiss</strong> if the request should not proceed (withdrawn, duplicate, etc.)—the student account stays active.
                </p>
              </div>
              <div className="deletion-modal-actions-primary">
                <button
                  type="button"
                  className="btn-delete-student-confirm"
                  onClick={handlePermanentDeleteStudent}
                  disabled={processing}
                >
                  {processing ? 'Working…' : 'Permanently delete account'}
                </button>
              </div>
              <div className="deletion-modal-divider">
                <span>or</span>
              </div>
              {!deletionDismissFormOpen ? (
                <button
                  type="button"
                  className="btn-dismiss-deletion-request"
                  onClick={() => setDeletionDismissFormOpen(true)}
                  disabled={processing}
                >
                  Dismiss request (keep account)
                </button>
              ) : (
                <div className="form-group">
                  <label htmlFor="deletionAdminNotes">Admin notes</label>
                  <textarea
                    id="deletionAdminNotes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Optional: reason for dismissal…"
                    rows={4}
                    disabled={processing}
                  />
                  <div className="deletion-dismiss-actions">
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => !processing && setDeletionDismissFormOpen(false)}
                      disabled={processing}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="btn-confirm-reject"
                      onClick={handleDismissDeletionRequest}
                      disabled={processing}
                    >
                      {processing ? 'Saving…' : 'Confirm dismiss'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => !processing && setIsDeletionRequestModalOpen(false)}
                disabled={processing}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Request Modal */}
      {isChangeRequestModalOpen && selectedChangeRequest && selectedStudent && (
        <div className="modal-overlay" onClick={() => !processing && setIsChangeRequestModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Process Change Request</h2>
              <button
                className="modal-close-btn"
                onClick={() => !processing && setIsChangeRequestModalOpen(false)}
                disabled={processing}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="request-summary">
                <p><strong>Student:</strong> {selectedStudent.alias}</p>
                <p><strong>Current Therapist ID:</strong> {selectedChangeRequest.current_therapist_id?.substring(0, 8)}...</p>
                <p><strong>Reason:</strong> {selectedChangeRequest.reason}</p>
                <p><strong>Requested:</strong> {formatDateTime(selectedChangeRequest.requested_at)}</p>
              </div>
              <div className="action-buttons-modal">
                <button
                  className={`btn-action ${changeRequestAction === 'approve' ? 'active' : ''}`}
                  onClick={() => setChangeRequestAction('approve')}
                  disabled={processing}
                >
                  Approve
                </button>
                <button
                  className={`btn-action ${changeRequestAction === 'reject' ? 'active' : ''}`}
                  onClick={() => setChangeRequestAction('reject')}
                  disabled={processing}
                >
                  Reject
                </button>
              </div>
              {changeRequestAction && (
                <div className="form-group">
                  <label htmlFor="adminNotes">Admin Notes</label>
                  <textarea
                    id="adminNotes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder={changeRequestAction === 'approve' 
                      ? 'Add notes about this approval...' 
                      : 'Add notes explaining the rejection...'}
                    rows={4}
                    disabled={processing}
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => !processing && setIsChangeRequestModalOpen(false)}
                disabled={processing}
              >
                Cancel
              </button>
              {changeRequestAction && (
                <button
                  className={changeRequestAction === 'approve' ? 'btn-confirm-approve' : 'btn-confirm-reject'}
                  onClick={handleProcessChangeRequest}
                  disabled={processing || !changeRequestAction}
                >
                  {processing ? 'Processing...' : changeRequestAction === 'approve' ? 'Approve Request' : 'Reject Request'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageStudentsPage;

