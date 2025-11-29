import { Link } from 'react-router-dom';
import './CaseloadPage.css';
import './StatusSelector.css'; // For status dot colors

const StudentSummaryCard = ({ student }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return '#28a745';
      case 'away':
        return '#ffc107';
      case 'offline':
      default:
        return '#6c757d';
    }
  };

  return (
    <div className="student-card">
      <div className="student-card-header">
        <h3 className="student-alias">{student.alias}</h3>
        {student.status && (
          <div className="student-status">
            <span 
              className="status-dot" 
              style={{ backgroundColor: getStatusColor(student.status) }}
            ></span>
            <span className="status-text">{student.status}</span>
          </div>
        )}
      </div>
      
      <div className="student-card-details">
        <div className="detail-item">
          <strong>Last Message:</strong> {student.lastContact || 'No messages yet'}
        </div>
        <div className="detail-item">
          <strong>Journals Shared:</strong> {student.journalsShared || 0}
        </div>
        <div className="detail-item">
          <strong>Appointments:</strong> {student.appointmentsCount || 0}
        </div>
        <div className="detail-item">
          <strong>Notes:</strong> {student.notesCount || 0}
        </div>
        {student.newJournals > 0 && (
          <div className="new-journal-indicator">
            {student.newJournals} New Journal{student.newJournals > 1 ? 's' : ''}
          </div>
        )}
        {student.appointmentsCount > 0 && (
          <div className="appointment-indicator">
            {student.appointmentsCount} Appointment{student.appointmentsCount > 1 ? 's' : ''}
          </div>
        )}
        {student.notesCount > 0 && (
          <div className="notes-indicator">
            {student.notesCount} Note{student.notesCount > 1 ? 's' : ''}
          </div>
        )}
      </div>
      
      <Link to={`/therapist-dashboard/student/${student.id}`} className="view-progress-btn">
        View Profile
      </Link>
    </div>
  );
};

export default StudentSummaryCard;
