import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../contexts/UserContext';
// Reusing some widget styles
import '../Student/Dashboard.css';
import './AdminDashboard.css';

const AdminDashboardHome = () => {
  const { user } = useUser();
  const [studentsCount, setStudentsCount] = useState(0);
  const [therapistsCount, setTherapistsCount] = useState(0);
  const [sessionsThisWeek, setSessionsThisWeek] = useState(0);
  const [crisisThisMonth, setCrisisThisMonth] = useState(0);
  const [journalEntriesCount, setJournalEntriesCount] = useState(null);
  const [resourcesCount, setResourcesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(true);
      return;
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        console.log('Current user:', user);
        console.log('User role:', user.user_metadata?.role);

        // Calculate start of this week (Monday)
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
        const startOfWeek = new Date(today);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);
        const startOfWeekISO = startOfWeek.toISOString().split('T')[0];

        // Start of this month for crisis count
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfMonthISO = startOfMonth.toISOString().split('T')[0];

        // Fetch all data in parallel
        const [studentsResult, therapistsResult, allTherapistsResult, sessionsResult, crisisResult, journalsResult, resourcesResult] = await Promise.all([
          // Total students count
          supabase
            .from('student_profiles')
            .select('*'),
          // Active therapists count (is_live = true)
          supabase
            .from('therapist_profiles')
            .select('*')
            .eq('is_live', true),
          // All therapists (for debugging)
          supabase
            .from('therapist_profiles')
            .select('*'),
          // Sessions this week (scheduled or completed appointments)
          supabase
            .from('appointments')
            .select('*')
            .gte('appointment_date', startOfWeekISO)
            .in('status', ['scheduled', 'completed']),
          // Crisis alerts this month
          supabase
            .from('crisis_events')
            .select('id')
            .gte('triggered_at', startOfMonth.toISOString()),
          // Journal entries total
          supabase
            .from('journal_entries')
            .select('id'),
          // Resources published
          supabase
            .from('resources')
            .select('id')
        ]);

        // Log results for debugging
        console.log('Students result:', studentsResult);
        console.log('Active therapists result:', therapistsResult);
        console.log('All therapists result:', allTherapistsResult);
        console.log('Sessions result:', sessionsResult);

        if (studentsResult.error) {
          console.error('Error fetching students:', studentsResult.error);
        } else {
          const count = studentsResult.data?.length || 0;
          console.log(`Found ${count} students`);
          setStudentsCount(count);
        }

        if (therapistsResult.error) {
          console.error('Error fetching active therapists:', therapistsResult.error);
          // Fallback: try counting all therapists
          if (!allTherapistsResult.error && allTherapistsResult.data) {
            const activeCount = allTherapistsResult.data.filter(t => t.is_live === true).length;
            console.log(`Found ${activeCount} active therapists (from all therapists)`);
            setTherapistsCount(activeCount);
          } else {
            console.error('Error fetching all therapists for fallback:', allTherapistsResult.error);
            // Set to 0 if both queries failed
            setTherapistsCount(0);
          }
        } else {
          const count = therapistsResult.data?.length || 0;
          console.log(`Found ${count} active therapists`);
          setTherapistsCount(count);
        }

        if (sessionsResult.error) {
          console.error('Error fetching sessions:', sessionsResult.error);
        } else {
          const count = sessionsResult.data?.length || 0;
          setSessionsThisWeek(count);
        }

        if (crisisResult.error) {
          console.error('Error fetching crisis events:', crisisResult.error);
        } else {
          setCrisisThisMonth(crisisResult.data?.length || 0);
        }

        if (journalsResult.error) {
          console.error('Error fetching journal entries:', journalsResult.error);
        } else {
          setJournalEntriesCount(journalsResult.data?.length ?? 0);
        }

        if (resourcesResult.error) {
          console.error('Error fetching resources:', resourcesResult.error);
        } else {
          setResourcesCount(resourcesResult.data?.length || 0);
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  if (loading) {
    return (
      <div className="admin-home">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '50vh',
          fontSize: '1.1rem',
          color: '#5b6888'
        }}>
          Loading analytics...
        </div>
      </div>
    );
  }

  return (
    <div className="admin-home">
      <h1 className="analytics-title">System Analytics</h1>
      <p className="analytics-subtitle">A high-level overview of platform activity.</p>

      <div className="analytics-grid">
        <div className="stat-card students">
          <p className="stat-card-label">Total Students</p>
          <p className="stat-card-value">{studentsCount.toLocaleString()}</p>
          <p className="stat-card-context">registered on platform</p>
        </div>
        <div className="stat-card therapists">
          <p className="stat-card-label">Active Therapists</p>
          <p className="stat-card-value">{therapistsCount.toLocaleString()}</p>
          <p className="stat-card-context">currently active</p>
        </div>
        <div className="stat-card sessions">
          <p className="stat-card-label">Sessions This Week</p>
          <p className="stat-card-value">{sessionsThisWeek.toLocaleString()}</p>
          <p className="stat-card-context">appointments held</p>
        </div>
        <div className="stat-card crisis">
          <p className="stat-card-label">Crisis Alerts This Month</p>
          <p className="stat-card-value" style={{ color: '#DC2626' }}>{crisisThisMonth.toLocaleString()}</p>
          <p className="stat-card-context">all resolved</p>
        </div>
        <div className="stat-card journals">
          <p className="stat-card-label">Journal Entries</p>
          <p className="stat-card-value" style={{ color: '#003DA5' }}>{journalEntriesCount !== null ? journalEntriesCount.toLocaleString() : '—'}</p>
          <p className="stat-card-context">across all students</p>
        </div>
        <div className="stat-card resources">
          <p className="stat-card-label">Resources Published</p>
          <p className="stat-card-value" style={{ color: '#7B1D1D' }}>{resourcesCount.toLocaleString()}</p>
          <p className="stat-card-context">available to students</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardHome;