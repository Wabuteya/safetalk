import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../contexts/UserContext';
import './BookAppointmentPage.css';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const BookAppointmentPage = () => {
  const { therapistId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser(); // Use cached user from context
  const [therapist, setTherapist] = useState(null);
  const [availability, setAvailability] = useState({});
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [studentNotes, setStudentNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');

  const fetchTherapistAndAvailability = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      if (!user) {
        setError('Please log in to book an appointment.');
        setLoading(false);
        return;
      }

      // Verify relationship and fetch therapist profile + availability in parallel
      const [relationshipResult, therapistResult, availabilityResult] = await Promise.all([
        supabase
          .from('therapist_student_relations')
          .select('therapist_id') // Only need therapist_id for verification
          .eq('student_id', user.id)
          .eq('therapist_id', therapistId)
          .single(),
        supabase
          .from('therapist_profiles')
          .select('user_id, full_name') // Only select needed fields
          .eq('user_id', therapistId)
          .single(),
        supabase
          .from('therapist_availability')
          .select('day_of_week, start_time, end_time') // Only select needed fields
          .eq('therapist_id', therapistId)
          .eq('is_available', true)
          .order('day_of_week', { ascending: true })
          .order('start_time', { ascending: true })
      ]);

      const { data: relationship, error: relError } = relationshipResult;
      const { data: therapistProfile, error: therapistError } = therapistResult;
      const { data: availabilityData, error: availError } = availabilityResult;

      if (relError || !relationship) {
        setError('You must be linked to this therapist to book appointments.');
        setLoading(false);
        return;
      }

      if (therapistError) throw therapistError;
      setTherapist(therapistProfile);

      if (availError) throw availError;

      // Group by day of week
      const grouped = {};
      (availabilityData || []).forEach(slot => {
        if (!grouped[slot.day_of_week]) {
          grouped[slot.day_of_week] = [];
        }
        grouped[slot.day_of_week].push({
          start_time: slot.start_time,
          end_time: slot.end_time
        });
      });

      setAvailability(grouped);
    } catch (err) {
      console.error('Error fetching therapist and availability:', err);
      setError(`Failed to load booking information: ${err.message || 'Unknown error'}.`);
    } finally {
      setLoading(false);
    }
  }, [user, therapistId]);

  useEffect(() => {
    if (user && therapistId) {
      fetchTherapistAndAvailability();
    }
  }, [therapistId, user, fetchTherapistAndAvailability]);

  // Memoize available dates calculation to prevent recalculation on every render
  const availableDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    const maxDays = 30; // Show next 30 days

    for (let i = 0; i < maxDays; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfWeek = date.getDay();
      
      // Only include dates where therapist has availability
      if (availability[dayOfWeek] && availability[dayOfWeek].length > 0) {
        dates.push({
          date: date.toISOString().split('T')[0],
          dayName: DAYS_OF_WEEK[dayOfWeek],
          dayOfWeek
        });
      }
    }

    return dates;
  }, [availability]);

  const generateTimeSlots = (startTime, endTime, slotDurationMinutes = 60) => {
    const slots = [];
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    for (let minutes = startTotalMinutes; minutes < endTotalMinutes; minutes += slotDurationMinutes) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeString = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      
      // Calculate end time for this slot
      const slotEndMinutes = minutes + slotDurationMinutes;
      const endHoursSlot = Math.floor(slotEndMinutes / 60);
      const endMinsSlot = slotEndMinutes % 60;
      const endTimeString = `${String(endHoursSlot).padStart(2, '0')}:${String(endMinsSlot).padStart(2, '0')}`;
      
      slots.push({
        start_time: timeString,
        end_time: endTimeString
      });
    }
    
    return slots;
  };

  const getAvailableTimeSlots = async (dayOfWeek) => {
    if (!availability[dayOfWeek]) return [];
    
    // Generate granular time slots (1-hour increments) for each available block
    const allSlots = [];
    availability[dayOfWeek].forEach(block => {
      const slots = generateTimeSlots(block.start_time, block.end_time, 60); // 60-minute slots
      allSlots.push(...slots);
    });
    
    // Check which slots are already booked for the selected date (batch check)
    const bookedSlots = await checkBookedSlots(selectedDate, allSlots);
    
    // Filter out booked slots
    const availableSlots = allSlots.filter(slot => !bookedSlots.has(slot.start_time));
    
    return availableSlots;
  };

  const checkBookedSlots = async (date, timeSlots) => {
    try {
      if (!date || !timeSlots || timeSlots.length === 0) return new Set();
      
      const startTimes = timeSlots.map(slot => slot.start_time).filter(Boolean);
      
      if (startTimes.length === 0) return new Set();
      
      const { data, error } = await supabase
        .from('appointments')
        .select('start_time')
        .eq('therapist_id', therapistId)
        .eq('appointment_date', date)
        .in('start_time', startTimes)
        .eq('status', 'scheduled');

      if (error) {
        // If error is about empty array, just return empty set
        if (error.code === 'PGRST116' || error.message?.includes('empty')) {
          return new Set();
        }
        console.error('Error checking booked slots:', error);
        return new Set();
      }
      
      // Return a Set of booked start times for quick lookup
      return new Set((data || []).map(apt => apt.start_time));
    } catch (err) {
      console.error('Error checking booked slots:', err);
      return new Set();
    }
  };

  const handleDateSelect = useCallback(async (date) => {
    setSelectedDate(date);
    setSelectedTimeSlot(null);
    setAvailableTimeSlots([]);
    
    // Load available time slots for the selected date
    if (date) {
      setLoadingTimeSlots(true);
      const dayOfWeek = new Date(date).getDay();
      const slots = await getAvailableTimeSlots(dayOfWeek);
      setAvailableTimeSlots(slots);
      setLoadingTimeSlots(false);
    }
  }, []);

  const handleTimeSlotSelect = useCallback((slot) => {
    // Slot availability is already checked when loading, so we can just select it
    setSelectedTimeSlot(slot);
  }, []);

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedTimeSlot) {
      alert('Please select a date and time slot.');
      return;
    }

    try {
      setBooking(true);
      setError('');

      if (!user) {
        setError('Please log in to book an appointment.');
        return;
      }

      // Double-check slot is still available (quick check)
      const { data: existingAppointment, error: checkError } = await supabase
        .from('appointments')
        .select('id')
        .eq('therapist_id', therapistId)
        .eq('appointment_date', selectedDate)
        .eq('start_time', selectedTimeSlot.start_time)
        .eq('status', 'scheduled')
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking slot availability:', checkError);
      }

      if (existingAppointment) {
        alert('This time slot was just booked by someone else. Please select another time.');
        setBooking(false);
        // Reload available slots
        const dayOfWeek = new Date(selectedDate).getDay();
        const slots = await getAvailableTimeSlots(dayOfWeek);
        setAvailableTimeSlots(slots);
        return;
      }

      const { error: insertError } = await supabase
        .from('appointments')
        .insert({
          therapist_id: therapistId,
          student_id: user.id,
          appointment_date: selectedDate,
          start_time: selectedTimeSlot.start_time,
          end_time: selectedTimeSlot.end_time,
          status: 'scheduled',
          student_notes: studentNotes.trim() || null
        });

      if (insertError) throw insertError;

      alert('Appointment booked successfully!');
      navigate('/student-dashboard');
    } catch (err) {
      console.error('Error booking appointment:', err);
      setError(`Failed to book appointment: ${err.message || 'Unknown error'}.`);
    } finally {
      setBooking(false);
    }
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  if (loading) {
    return (
      <div className="book-appointment-page">
        <div className="loading-container">Loading booking information...</div>
      </div>
    );
  }

  if (error && !therapist) {
    return (
      <div className="book-appointment-page">
        <div className="error-banner">{error}</div>
        <button onClick={() => navigate('/student-dashboard/therapists')} className="back-btn">
          ← Back to Therapists
        </button>
      </div>
    );
  }

  return (
    <div className="book-appointment-page">
      <div className="booking-header">
        <button onClick={() => navigate('/student-dashboard/therapists')} className="back-btn">
          ← Back
        </button>
        <h1>Book Appointment with {therapist?.full_name || 'Therapist'}</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="booking-steps">
        <div className="step">
          <h2>Step 1: Select Date</h2>
          <p>Choose a date when your therapist is available.</p>
          <div className="dates-grid">
            {availableDates.length === 0 ? (
              <p className="no-availability">No available dates in the next 30 days. Please contact your therapist.</p>
            ) : (
              availableDates.map(({ date, dayName }) => (
                <button
                  key={date}
                  className={`date-btn ${selectedDate === date ? 'selected' : ''}`}
                  onClick={() => handleDateSelect(date)}
                >
                  <div className="date-day">{dayName}</div>
                  <div className="date-number">{new Date(date).getDate()}</div>
                  <div className="date-month">{new Date(date).toLocaleDateString('en-US', { month: 'short' })}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {selectedDate && (
          <div className="step">
            <h2>Step 2: Select Time</h2>
            <p>Choose an available time slot for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.</p>
            {loadingTimeSlots ? (
              <div className="loading-time-slots">Loading available times...</div>
            ) : availableTimeSlots.length === 0 ? (
              <p className="no-availability">No available time slots for this date. Please select another date.</p>
            ) : (
              <div className="time-slots-grid">
                {availableTimeSlots.map((slot, index) => (
                  <button
                    key={index}
                    className={`time-slot-btn ${selectedTimeSlot?.start_time === slot.start_time ? 'selected' : ''}`}
                    onClick={() => handleTimeSlotSelect(slot)}
                  >
                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedDate && selectedTimeSlot && (
          <div className="step">
            <h2>Step 3: Add Notes (Optional)</h2>
            <p>Any specific topics or concerns you'd like to discuss?</p>
            <textarea
              value={studentNotes}
              onChange={(e) => setStudentNotes(e.target.value)}
              placeholder="Optional: Add any notes or topics you'd like to discuss..."
              rows="4"
              className="notes-textarea"
            />
          </div>
        )}

        {selectedDate && selectedTimeSlot && (
          <div className="booking-summary">
            <h3>Appointment Summary</h3>
            <div className="summary-details">
              <p><strong>Date:</strong> {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Time:</strong> {formatTime(selectedTimeSlot.start_time)} - {formatTime(selectedTimeSlot.end_time)}</p>
              <p><strong>Therapist:</strong> {therapist?.full_name || 'Therapist'}</p>
            </div>
            <button
              onClick={handleBookAppointment}
              disabled={booking}
              className="book-btn"
            >
              {booking ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookAppointmentPage;
