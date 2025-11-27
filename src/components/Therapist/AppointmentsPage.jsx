import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../contexts/UserContext';
import AvailabilityManager from './AvailabilityManager';
import './AppointmentsPage.css';

const localizer = momentLocalizer(moment);

const AppointmentsPage = () => {
  const { user } = useUser(); // Use cached user from context
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' or 'availability'
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const handleSelectEvent = useCallback((event) => {
    setSelectedEvent(event);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedEvent(null);
  }, []);
  
  useEffect(() => {
    fetchAppointments();
  }, [user]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError('');

      if (!user) {
        setError('Please log in to view appointments.');
        setLoading(false);
        return;
      }

      // Fetch appointments first
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id, therapist_id, student_id, appointment_date, start_time, end_time, status, notes, student_notes')
        .eq('therapist_id', user.id)
        .in('status', ['scheduled', 'completed'])
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (appointmentsError) throw appointmentsError;

      // Fetch student aliases only for students with appointments (more efficient)
      const studentIds = [...new Set((appointments || []).map(apt => apt.student_id))];
      const studentAliasesMap = {};
      
      if (studentIds.length > 0) {
        const { data: studentProfiles, error: profilesError } = await supabase
          .from('student_profiles')
          .select('user_id, alias')
          .in('user_id', studentIds);

        if (!profilesError && studentProfiles) {
          studentProfiles.forEach(profile => {
            studentAliasesMap[profile.user_id] = profile.alias;
          });
        }
      }

      // Format appointments for calendar
      const formattedEvents = (appointments || []).map(apt => {
        const [year, month, day] = apt.appointment_date.split('-').map(Number);
        const [startHours, startMinutes] = apt.start_time.split(':').map(Number);
        const [endHours, endMinutes] = apt.end_time.split(':').map(Number);
        const start = new Date(year, month - 1, day, startHours, startMinutes);
        const end = new Date(year, month - 1, day, endHours, endMinutes);
        const studentAlias = studentAliasesMap[apt.student_id] || 'Student';

        return {
          id: apt.id,
          title: `Session with ${studentAlias}`,
          start,
          end,
          studentAlias: studentAlias,
          appointment: apt
        };
      });

      setEvents(formattedEvents);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError(`Failed to load appointments: ${err.message || 'Unknown error'}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', selectedEvent.appointment.id);

      if (error) throw error;

      await fetchAppointments();
      handleCloseModal();
      alert('Appointment cancelled successfully.');
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      alert('Failed to cancel appointment. Please try again.');
    }
  };


  return (
    <div className="appointments-layout">
      {/* --- APPOINTMENT DETAIL MODAL --- */}
      {selectedEvent && (
        <div className="modal-backdrop">
          <div className="modal-content appointment-modal">
            <h3>Appointment Details</h3>
            <p><strong>Student:</strong> {selectedEvent.studentAlias}</p>
            <p><strong>Date:</strong> {moment(selectedEvent.start).format('MMMM Do, YYYY')}</p>
            <p><strong>Time:</strong> {moment(selectedEvent.start).format('h:mm A')} - {moment(selectedEvent.end).format('h:mm A')}</p>
            {selectedEvent.appointment?.notes && (
              <p><strong>Notes:</strong> {selectedEvent.appointment.notes}</p>
            )}
            <div className="modal-actions">
              <button onClick={handleCloseModal} className="modal-btn cancel">Close</button>
              <button onClick={handleCancelAppointment} className="modal-btn delete">Cancel Appointment</button>
              <button className="modal-btn confirm">Join Chat Session</button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <h1>My Appointments</h1>
        <div className="tabs-container">
          <button
            className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            Calendar
          </button>
          <button
            className={`tab-btn ${activeTab === 'availability' ? 'active' : ''}`}
            onClick={() => setActiveTab('availability')}
          >
            Set Availability
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {activeTab === 'calendar' && (
        <div className="calendar-container">
          {loading ? (
            <div className="loading-container">Loading appointments...</div>
          ) : (
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '70vh' }}
              onSelectEvent={handleSelectEvent}
            />
          )}
        </div>
      )}

      {activeTab === 'availability' && <AvailabilityManager />}
    </div>
  );
};

export default AppointmentsPage;