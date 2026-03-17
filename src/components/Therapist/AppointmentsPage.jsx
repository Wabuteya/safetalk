import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../contexts/UserContext';
import AvailabilityManager from './AvailabilityManager';
import RescheduleModal from '../Appointments/RescheduleModal';
import { therapistBulkCancel } from '../../utils/appointmentReschedule';
import './AppointmentsPage.css';

const localizer = momentLocalizer(moment);

const AppointmentsPage = () => {
  const navigate = useNavigate();
  const { user } = useUser(); // Use cached user from context
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' or 'availability'
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [rescheduleEvent, setRescheduleEvent] = useState(null);
  const [emergencyCancelDate, setEmergencyCancelDate] = useState('');
  const [emergencyCancelling, setEmergencyCancelling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const handleSelectEvent = useCallback((event) => {
    setSelectedEvent(event);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedEvent(null);
  }, []);
  
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      if (!user) {
        setError('Please log in to view appointments.');
        setLoading(false);
        return;
      }

      // Get today's date in YYYY-MM-DD format (local timezone)
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      console.log('Fetching appointments for therapist:', user.id);
      console.log('Today date string:', todayStr);

      // Fetch appointments - include today and future dates
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id, therapist_id, student_id, appointment_date, start_time, end_time, status, notes, student_notes')
        .eq('therapist_id', user.id)
        .in('status', ['scheduled', 'rescheduled', 'completed'])
        .gte('appointment_date', todayStr)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      console.log('Fetched appointments:', appointments);

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
  }, [user]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Refresh appointments when switching to calendar tab
  useEffect(() => {
    if (activeTab === 'calendar' && user) {
      fetchAppointments();
    }
  }, [activeTab, user, fetchAppointments]);

  const handleCancelAppointment = async () => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'cancelled_by_therapist' })
        .eq('id', selectedEvent.appointment.id);

      if (updateError) throw updateError;

      await fetchAppointments();
      handleCloseModal();
      alert('Appointment cancelled successfully.');
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      alert('Failed to cancel appointment. Please try again.');
    }
  };

  const handleEmergencyBulkCancel = async () => {
    if (!emergencyCancelDate) {
      alert('Please select a date.');
      return;
    }
    if (!window.confirm(`Cancel ALL scheduled appointments on ${emergencyCancelDate}? Affected students will need to be notified.`)) {
      return;
    }
    setEmergencyCancelling(true);
    try {
      const result = await therapistBulkCancel(user.id, emergencyCancelDate);
      if (result.success) {
        const count = result.affectedCount ?? 0;
        alert(`Cancelled ${count} appointment(s) for ${emergencyCancelDate}.`);
        setEmergencyCancelDate('');
        await fetchAppointments();
      } else {
        alert(result.error || 'Failed to cancel appointments.');
      }
    } catch (err) {
      console.error('Emergency cancel error:', err);
      alert('Failed to cancel appointments. Please try again.');
    } finally {
      setEmergencyCancelling(false);
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
              <button onClick={() => { setRescheduleEvent(selectedEvent); handleCloseModal(); }} className="modal-btn">Reschedule</button>
              <button onClick={handleCancelAppointment} className="modal-btn delete">Cancel Appointment</button>
              <button
                className="modal-btn confirm"
                onClick={() => {
                  handleCloseModal();
                  navigate(`/therapist-dashboard/student/${selectedEvent.appointment.student_id}`, {
                    state: { openChatTab: true },
                  });
                }}
              >
                Join Chat Session
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="page-title">My Appointments</h1>
      <div className="view-tabs">
        <button
          className={`view-tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          Calendar
        </button>
        <button
          className={`view-tab-btn ${activeTab === 'availability' ? 'active' : ''}`}
          onClick={() => setActiveTab('availability')}
        >
          Set Availability
        </button>
        {activeTab === 'calendar' && (
          <button
            onClick={fetchAppointments}
            className="view-tab-btn refresh-btn"
            title="Refresh appointments"
          >
            ↻ Refresh
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {rescheduleEvent && user && (
        <RescheduleModal
          appointment={rescheduleEvent.appointment}
          therapistId={user.id}
          userRole="therapist"
          onSuccess={() => {
            setRescheduleEvent(null);
            fetchAppointments();
          }}
          onCancel={() => setRescheduleEvent(null)}
        />
      )}

      {activeTab === 'calendar' && (
        <>
        <div className="emergency-banner">
          <label htmlFor="emergency-cancel-date">Emergency cancel all appointments on:</label>
          <input
            id="emergency-cancel-date"
            type="date"
            className="emergency-date-input"
            value={emergencyCancelDate}
            onChange={(e) => setEmergencyCancelDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
          <button
            type="button"
            className="cancel-all-btn"
            onClick={handleEmergencyBulkCancel}
            disabled={!emergencyCancelDate || emergencyCancelling}
          >
            {emergencyCancelling ? 'Cancelling…' : 'Cancel All for Date'}
          </button>
        </div>
        <div className="calendar-wrapper">
          {loading ? (
            <div className="loading-container">Loading appointments...</div>
          ) : (
            <Calendar
              className="appointments-calendar"
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '70vh' }}
              onSelectEvent={handleSelectEvent}
            />
          )}
        </div>
        </>
      )}

      {activeTab === 'availability' && <AvailabilityManager />}
    </div>
  );
};

export default AppointmentsPage;