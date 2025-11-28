import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../contexts/UserContext';
import StudentSummaryCard from './StudentSummaryCard.jsx';
import './CaseloadPage.css';

const CaseloadPage = () => {
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCaseload = useCallback(async () => {
    if (!user) {
      setError('Please log in to view your caseload.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

        // Get all students linked to this therapist
        const { data: relationships, error: relError } = await supabase
          .from('therapist_student_relations')
          .select('student_id')
          .eq('therapist_id', user.id);

        if (relError) throw relError;

        if (!relationships || relationships.length === 0) {
          setStudents([]);
          setLoading(false);
          return;
        }

        const studentIds = relationships.map(rel => rel.student_id);

        // Fetch student profiles, journal counts, appointment counts, and note counts in parallel for better performance
        const [profilesResult, journalsResult, appointmentsResult, notesResult] = await Promise.all([
          supabase
            .from('student_profiles')
            .select('user_id, alias') // Only select needed fields
            .in('user_id', studentIds),
          supabase
            .from('journal_entries')
            .select('student_id, therapist_viewed_at') // Only select needed fields
            .in('student_id', studentIds)
            .eq('is_shared_with_therapist', true),
          supabase
            .from('appointments')
            .select('student_id') // Only select needed fields
            .in('student_id', studentIds)
            .eq('therapist_id', user.id),
          supabase
            .from('therapist_notes')
            .select('student_id') // Only select needed fields
            .in('student_id', studentIds)
            .eq('therapist_id', user.id)
        ]);

        const { data: studentProfiles, error: profilesError } = profilesResult;
        const { data: journalCounts, error: journalError } = journalsResult;
        const { data: appointments, error: appointmentsError } = appointmentsResult;
        const { data: notes, error: notesError } = notesResult;

        if (profilesError) {
          console.error('Error fetching student profiles:', profilesError);
        }
        if (journalError) {
          console.error('Error fetching journal counts:', journalError);
        }
        if (appointmentsError) {
          console.error('Error fetching appointment counts:', appointmentsError);
        }
        if (notesError) {
          console.error('Error fetching note counts:', notesError);
        }

        // Create a map for quick lookup
        const profileMap = {};
        (studentProfiles || []).forEach(profile => {
          profileMap[profile.user_id] = profile;
        });

        // Count journals per student
        const journalCountMap = {};
        const unreadJournalCountMap = {};
        (journalCounts || []).forEach(entry => {
          if (!journalCountMap[entry.student_id]) {
            journalCountMap[entry.student_id] = 0;
            unreadJournalCountMap[entry.student_id] = 0;
          }
          journalCountMap[entry.student_id]++;
          if (!entry.therapist_viewed_at) {
            unreadJournalCountMap[entry.student_id]++;
          }
        });

        // Count appointments per student
        const appointmentCountMap = {};
        (appointments || []).forEach(apt => {
          if (!appointmentCountMap[apt.student_id]) {
            appointmentCountMap[apt.student_id] = 0;
          }
          appointmentCountMap[apt.student_id]++;
        });

        // Count notes per student
        const noteCountMap = {};
        (notes || []).forEach(note => {
          if (!noteCountMap[note.student_id]) {
            noteCountMap[note.student_id] = 0;
          }
          noteCountMap[note.student_id]++;
        });

        // Format student data with aliases from database
        const formattedStudents = studentIds.map(studentId => {
          const profile = profileMap[studentId];
          return {
            id: studentId,
            alias: profile?.alias || `Student ${studentId.substring(0, 8)}...`,
            journalsShared: journalCountMap[studentId] || 0,
            newJournals: unreadJournalCountMap[studentId] || 0,
            appointmentsCount: appointmentCountMap[studentId] || 0,
            notesCount: noteCountMap[studentId] || 0,
            lastContact: 'N/A', // Will need to fetch from chat/appointments
            status: 'offline' // Will need to fetch from student status if available
          };
        });

        setStudents(formattedStudents);
      } catch (err) {
        console.error('Error fetching caseload:', err);
        setError(`Failed to load caseload: ${err.message || 'Unknown error'}.`);
      } finally {
        setLoading(false);
      }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchCaseload();
    }
  }, [user, fetchCaseload]);

  const filteredStudents = useMemo(() => {
    return students.filter(student =>
      student.alias.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, students]);

  if (loading) {
    return (
      <div className="caseload-layout">
        <div className="loading-container">
          <p>Loading your caseload...</p>
        </div>
      </div>
    );
  }

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

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {students.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h2>No Students Assigned</h2>
          <p>You don't have any students assigned to your caseload yet.</p>
        </div>
      ) : (
        <div className="caseload-grid">
          {filteredStudents.map(student => (
            <StudentSummaryCard key={student.id} student={student} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CaseloadPage;
