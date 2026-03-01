import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { studentRescheduleAppointment, therapistRescheduleAppointment } from '../../utils/appointmentReschedule';
import './RescheduleModal.css';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const RescheduleModal = ({ appointment, therapistId, userRole, onSuccess, onCancel }) => {
  const [availability, setAvailability] = useState({});
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [availableDates, setAvailableDates] = useState([]);

  const fetchAvailability = useCallback(async () => {
    if (!therapistId) return;
    const { data, error: err } = await supabase
      .from('therapist_availability')
      .select('day_of_week, start_time, end_time')
      .eq('therapist_id', therapistId)
      .eq('is_available', true)
      .order('day_of_week')
      .order('start_time');
    if (err) return;
    const grouped = {};
    (data || []).forEach((s) => {
      if (!grouped[s.day_of_week]) grouped[s.day_of_week] = [];
      grouped[s.day_of_week].push({ start_time: s.start_time, end_time: s.end_time });
    });
    setAvailability(grouped);
  }, [therapistId]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  useEffect(() => {
    if (!availability || Object.keys(availability).length === 0) return;
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dow = d.getDay();
      if (availability[dow]?.length) {
        dates.push({
          date: d.toISOString().split('T')[0],
          dayName: DAYS_OF_WEEK[dow],
          dayOfWeek: dow,
        });
      }
    }
    setAvailableDates(dates);
  }, [availability]);

  const generateTimeSlots = (startTime, endTime, duration = 60) => {
    const slots = [];
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    let m = sh * 60 + sm;
    const endM = eh * 60 + em;
    while (m + duration <= endM) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const start = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      const m2 = m + duration;
      const h2 = Math.floor(m2 / 60);
      const min2 = m2 % 60;
      const end = `${String(h2).padStart(2, '0')}:${String(min2).padStart(2, '0')}`;
      slots.push({ start_time: start, end_time: end });
      m += duration;
    }
    return slots;
  };

  const getBookedStartTimes = useCallback(
    async (date) => {
      let query = supabase
        .from('appointments')
        .select('id, start_time')
        .eq('therapist_id', therapistId)
        .eq('appointment_date', date)
        .in('status', ['scheduled', 'rescheduled']);
      const { data } = await query;
      return new Set(
        (data || [])
          .filter((a) => a.id !== appointment?.id)
          .map((a) => a.start_time)
      );
    },
    [therapistId, appointment?.id]
  );

  const handleDateSelect = useCallback(
    async (date) => {
      setSelectedDate(date);
      setSelectedSlot(null);
      setAvailableSlots([]);
      if (!date || !availability) return;
      const dow = new Date(date).getDay();
      const blocks = availability[dow] || [];
      if (!blocks.length) return;
      setLoadingSlots(true);
      const allSlots = [];
      blocks.forEach((b) => {
        allSlots.push(...generateTimeSlots(b.start_time, b.end_time));
      });
      const booked = await getBookedStartTimes(date);
      const available = allSlots.filter((s) => !booked.has(s.start_time));
      setAvailableSlots(available);
      setLoadingSlots(false);
    },
    [availability, getBookedStartTimes]
  );

  const handleSubmit = async () => {
    if (!selectedDate || !selectedSlot) {
      setError('Please select a date and time.');
      return;
    }
    setSubmitting(true);
    setError('');
    const rescheduleFn = userRole === 'student' ? studentRescheduleAppointment : therapistRescheduleAppointment;
    const result = await rescheduleFn(
      appointment.id,
      selectedDate,
      selectedSlot.start_time,
      selectedSlot.end_time
    );
    setSubmitting(false);
    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error || 'Reschedule failed.');
    }
  };

  const formatTime = (t) => {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
  };

  const currentDate = appointment?.appointment_date;
  const currentTime = appointment?.start_time;

  return (
    <div className="reschedule-modal-backdrop" onClick={onCancel}>
      <div className="reschedule-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Reschedule Appointment</h3>
        <p className="reschedule-current">
          Current: {currentDate} at {formatTime(currentTime)}
        </p>
        {error && <div className="reschedule-error">{error}</div>}
        <div className="reschedule-step">
          <label>Select new date</label>
          <div className="reschedule-dates">
            {availableDates.slice(0, 14).map(({ date, dayName }) => (
              <button
                key={date}
                type="button"
                className={`reschedule-date-btn ${selectedDate === date ? 'selected' : ''}`}
                onClick={() => handleDateSelect(date)}
              >
                {dayName.slice(0, 3)} {new Date(date).getDate()}
              </button>
            ))}
          </div>
        </div>
        {selectedDate && (
          <div className="reschedule-step">
            <label>Select new time</label>
            {loadingSlots ? (
              <p>Loading times…</p>
            ) : availableSlots.length === 0 ? (
              <p className="no-slots">No available slots for this date.</p>
            ) : (
              <div className="reschedule-slots">
                {availableSlots.map((slot, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`reschedule-slot-btn ${selectedSlot?.start_time === slot.start_time ? 'selected' : ''}`}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="reschedule-actions">
          <button type="button" className="reschedule-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="reschedule-confirm"
            onClick={handleSubmit}
            disabled={!selectedDate || !selectedSlot || submitting}
          >
            {submitting ? 'Rescheduling…' : 'Confirm Reschedule'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RescheduleModal;
