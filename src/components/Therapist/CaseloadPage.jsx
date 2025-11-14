import React, { useState, useMemo } from 'react';
import StudentSummaryCard from './StudentSummaryCard.jsx';
import './CaseloadPage.css';

// MOCK DATA: A therapist's list of assigned students
const mockCaseload = [
  { id: 'student-123', alias: 'Anonymous Panda', lastContact: '2025-11-14', newJournals: 1 },
  { id: 'student-124', alias: 'Clever Koala', lastContact: '2025-11-12', newJournals: 0 },
  { id: 'student-125', alias: 'Quiet Bunny', lastContact: '2025-11-13', newJournals: 3 },
  { id: 'student-126', alias: 'Calm Capybara', lastContact: '2025-11-10', newJournals: 0 },
];

const CaseloadPage = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCaseload = useMemo(() => {
    return mockCaseload.filter(student =>
      student.alias.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  return (
    <div className="caseload-layout">
      <div className="page-header">
        <h1>My Caseload</h1>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by alias..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="caseload-grid">
        {filteredCaseload.map(student => (
          <StudentSummaryCard key={student.id} student={student} />
        ))}
      </div>
    </div>
  );
};

export default CaseloadPage;