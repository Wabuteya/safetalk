import React, { useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './AppointmentsPage.css';

const localizer = momentLocalizer(moment);

// MOCK DATA: List of scheduled appointments
const mockAppointments = [
  {
    id: 1,
    title: 'Session with Anonymous Panda',
    start: new Date(2025, 10, 18, 10, 0, 0), // Note: Month is 0-indexed (10 = November)
    end: new Date(2025, 10, 18, 10, 50, 0),
    studentAlias: 'Anonymous Panda',
  },
  {
    id: 2,
    title: 'Session with Clever Koala',
    start: new Date(2025, 10, 19, 14, 0, 0),
    end: new Date(2025, 10, 19, 14, 50, 0),
    studentAlias: 'Clever Koala',
  },
];


const AppointmentsPage = () => {
  const [events, setEvents] = useState(mockAppointments);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
  };
  
  const handleCancelAppointment = () => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
        setEvents(events.filter(e => e.id !== selectedEvent.id));
        handleCloseModal();
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
      </div>
      <div className="calendar-container">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '70vh' }}
          onSelectEvent={handleSelectEvent}
        />
      </div>
    </div>
  );
};

export default AppointmentsPage;