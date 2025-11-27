import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

const UpcomingAppointmentsWidget = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [therapistId, setTherapistId] = useState(null);

  useEffect(() => {
    fetchUpcomingAppointments();
  }, []);

  const fetchUpcomingAppointments = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get linked therapist
      const { data: relationship } = await supabase
        .from('therapist_student_relations')
        .select('therapist_id')
        .eq('student_id', user.id)
        .maybeSingle();

      if (!relationship) {
        setLoading(false);
        return;
      }

      setTherapistId(relationship.therapist_id);

      // Fetch upcoming appointments
      const { data: appointmentsData, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('student_id', user.id)
        .eq('status', 'scheduled')
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(3);

      if (error) throw error;
      setAppointments(appointmentsData || []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  const handleBookClick = () => {
    if (therapistId) {
      navigate(`/student-dashboard/book-appointment/${therapistId}`);
    } else {
      navigate('/student-dashboard/therapists');
    }
  };

  if (loading) {
    return (
      <div className="widget-card appointments">
        <h3>Upcoming Appointments</h3>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="widget-card appointments">
      <h3>Upcoming Appointments</h3>
      {appointments.length === 0 ? (
        <>
          <p>You have no upcoming appointments.</p>
          <button onClick={handleBookClick}>Book a Session</button>
        </>
      ) : (
        <>
          <div className="appointments-list">
            {appointments.map(apt => (
              <div key={apt.id} className="appointment-item">
                <div className="appointment-date">{formatDate(apt.appointment_date)}</div>
                <div className="appointment-time">{formatTime(apt.start_time)}</div>
              </div>
            ))}
          </div>
          <button onClick={handleBookClick}>Book Another Session</button>
        </>
      )}
    </div>
  );
};

export default UpcomingAppointmentsWidget;

