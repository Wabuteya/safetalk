import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
// Reusing some widget styles
import '../Student/Dashboard.css';
import './AdminDashboard.css';

const AdminDashboardHome = () => {
  const [studentsCount, setStudentsCount] = useState(0);
  const [therapistsCount, setTherapistsCount] = useState(0);
  const [sessionsThisWeek, setSessionsThisWeek] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);

        // Verify user is admin
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('No user found');
          setLoading(false);
          return;
        }
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

        // Fetch all data in parallel - using select('*') like ManageTherapistsPage does
        const [studentsResult, therapistsResult, allTherapistsResult, sessionsResult] = await Promise.all([
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
            .in('status', ['scheduled', 'completed'])
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
          console.log(`Found ${count} sessions this week`);
          setSessionsThisWeek(count);
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

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
          <div className="stat-card-title">Total Students</div>
          <div className="stat-card-value">{studentsCount.toLocaleString()}</div>
        </div>
        <div className="stat-card therapists">
          <div className="stat-card-title">Active Therapists</div>
          <div className="stat-card-value">{therapistsCount.toLocaleString()}</div>
        </div>
        <div className="stat-card sessions">
          <div className="stat-card-title">Sessions This Week</div>
          <div className="stat-card-value">{sessionsThisWeek.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardHome;