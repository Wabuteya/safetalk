import React from 'react';
import { Link } from 'react-router-dom';
import './CaseloadPage.css'; // We'll use one CSS file for this feature

const StudentSummaryCard = ({ student }) => {
  return (
    <div className="student-card">
      <h3 className="student-alias">{student.alias}</h3>
      <div className="student-card-details">
        <p><strong>Last Contact:</strong> {student.lastContact}</p>
        {student.newJournals > 0 && (
          <div className="new-journal-indicator">
            {student.newJournals} New Shared Journal{student.newJournals > 1 ? 's' : ''}
          </div>
        )}
      </div>
      {/* This link will point to the dynamic progress page we build next */}
      <Link to={`/therapist-dashboard/student/${student.id}`} className="view-progress-btn">
        View Progress & Details
      </Link>
    </div>
  );
};

export default StudentSummaryCard;