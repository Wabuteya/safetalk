import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import './AvailabilityManager.css';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

const DAY_COLORS = {
  SUNDAY: '#9CA3AF',
  MONDAY: '#003DA5',
  TUESDAY: '#7B1D1D',
  WEDNESDAY: '#003DA5',
  THURSDAY: '#7B1D1D',
  FRIDAY: '#F5A800',
  SATURDAY: '#9CA3AF',
};

const AvailabilityManager = () => {
  const [availability, setAvailability] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to manage availability.');
        setLoading(false);
        return;
      }

      const { data: availabilityData, error: fetchError } = await supabase
        .from('therapist_availability')
        .select('*')
        .eq('therapist_id', user.id)
        .eq('is_available', true)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (fetchError) throw fetchError;

      // Group by day of week
      const grouped = {};
      (availabilityData || []).forEach(slot => {
        if (!grouped[slot.day_of_week]) {
          grouped[slot.day_of_week] = [];
        }
        grouped[slot.day_of_week].push({
          id: slot.id,
          start_time: slot.start_time,
          end_time: slot.end_time
        });
      });

      setAvailability(grouped);
    } catch (err) {
      console.error('Error fetching availability:', err);
      setError(`Failed to load availability: ${err.message || 'Unknown error'}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTimeSlot = (dayOfWeek) => {
    const newSlot = {
      id: `temp-${Date.now()}`,
      start_time: '09:00',
      end_time: '10:00'
    };

    setAvailability(prev => ({
      ...prev,
      [dayOfWeek]: [...(prev[dayOfWeek] || []), newSlot]
    }));
  };

  const handleRemoveTimeSlot = (dayOfWeek, slotId) => {
    setAvailability(prev => ({
      ...prev,
      [dayOfWeek]: (prev[dayOfWeek] || []).filter(slot => slot.id !== slotId)
    }));
  };

  const handleTimeChange = (dayOfWeek, slotId, field, value) => {
    setAvailability(prev => ({
      ...prev,
      [dayOfWeek]: (prev[dayOfWeek] || []).map(slot =>
        slot.id === slotId ? { ...slot, [field]: value } : slot
      )
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to save availability.');
        return;
      }

      // Validate all time slots
      for (const dayOfWeek in availability) {
        const slots = availability[dayOfWeek];
        for (const slot of slots) {
          if (slot.start_time >= slot.end_time) {
            setError(`Invalid time slot on ${DAYS_OF_WEEK[dayOfWeek].label}: End time must be after start time.`);
            setSaving(false);
            return;
          }
        }
      }

      // Delete all existing availability for this therapist
      const { error: deleteError } = await supabase
        .from('therapist_availability')
        .delete()
        .eq('therapist_id', user.id);

      if (deleteError) throw deleteError;

      // Insert new availability slots
      const slotsToInsert = [];
      for (const dayOfWeek in availability) {
        const slots = availability[dayOfWeek];
        for (const slot of slots) {
            slotsToInsert.push({
              therapist_id: user.id,
              day_of_week: parseInt(dayOfWeek),
              start_time: slot.start_time,
              end_time: slot.end_time,
              is_available: true
            });
        }
      }

      if (slotsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('therapist_availability')
          .insert(slotsToInsert);

        if (insertError) throw insertError;
      }

      setSuccess('Availability saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
      await fetchAvailability(); // Reload to get database IDs
    } catch (err) {
      console.error('Error saving availability:', err);
      setError(`Failed to save availability: ${err.message || 'Unknown error'}.`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="availability-manager">
        <div className="loading-container">Loading availability...</div>
      </div>
    );
  }

  return (
    <div className="availability-manager">
      <h2 className="availability-title">Set Your Availability</h2>
      <p className="availability-subtitle">Define the days and time blocks when students can book appointments with you.</p>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      <div className="availability-days">
        {DAYS_OF_WEEK.map(day => {
          const hasSlots = availability[day.value]?.length > 0;
          const dayKey = day.label.toUpperCase();
          const dayColor = DAY_COLORS[dayKey] || '#003DA5';
          const isFriday = dayKey === 'FRIDAY';
          return (
            <div
              key={day.value}
              className={`day-card ${hasSlots ? 'has-slots' : ''}`}
              style={{ borderLeftColor: dayColor }}
            >
              <div className="day-card-header">
                <span className="day-name" style={{ color: dayColor }}>
                  {day.label}
                </span>
                <button
                  type="button"
                  onClick={() => handleAddTimeSlot(day.value)}
                  className="add-slot-btn"
                  style={{
                    background: dayColor,
                    color: isFriday ? '#111827' : 'white',
                  }}
                >
                  + Add Time Slot
                </button>
              </div>

              <div className="time-slots">
                {(availability[day.value] || []).map((slot, index) => (
                  <div key={slot.id || index} className="time-slot-row">
                    <input
                      type="time"
                      value={slot.start_time}
                      onChange={(e) => handleTimeChange(day.value, slot.id, 'start_time', e.target.value)}
                      className="time-input"
                    />
                    <span className="time-separator">to</span>
                    <input
                      type="time"
                      value={slot.end_time}
                      onChange={(e) => handleTimeChange(day.value, slot.id, 'end_time', e.target.value)}
                      className="time-input"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveTimeSlot(day.value, slot.id)}
                      className="remove-slot-btn"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {(!availability[day.value] || availability[day.value].length === 0) && (
                  <p className="no-slots-text">No time slots added for this day.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="availability-actions">
        <button
          onClick={handleSave}
          disabled={saving}
          className="save-availability-btn"
        >
          {saving ? 'Saving...' : 'Save Availability'}
        </button>
      </div>
    </div>
  );
};

export default AvailabilityManager;
