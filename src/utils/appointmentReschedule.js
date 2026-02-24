import { supabase } from '../supabaseClient';

/**
 * Student reschedule: calls RPC, validates 24h rule and availability server-side.
 * @returns {{ success: boolean, error?: string }}
 */
export async function studentRescheduleAppointment(appointmentId, newDate, newStartTime, newEndTime) {
  const { data, error } = await supabase.rpc('student_reschedule_appointment', {
    p_appointment_id: appointmentId,
    p_new_date: newDate,
    p_new_start_time: newStartTime,
    p_new_end_time: newEndTime,
  });
  if (error) return { success: false, error: error.message };
  const result = data || {};
  if (!result.success) return { success: false, error: result.error || 'Reschedule failed.' };
  return { success: true };
}

/**
 * Therapist reschedule: no 24h check, same availability validation.
 */
export async function therapistRescheduleAppointment(appointmentId, newDate, newStartTime, newEndTime) {
  const { data, error } = await supabase.rpc('therapist_reschedule_appointment', {
    p_appointment_id: appointmentId,
    p_new_date: newDate,
    p_new_start_time: newStartTime,
    p_new_end_time: newEndTime,
  });
  if (error) return { success: false, error: error.message };
  const result = data || {};
  if (!result.success) return { success: false, error: result.error || 'Reschedule failed.' };
  return { success: true };
}

/**
 * Therapist emergency bulk cancel for a single date.
 * @returns {{ success: boolean, affectedCount?: number, error?: string }}
 */
export async function therapistBulkCancel(therapistId, targetDate) {
  const { data, error } = await supabase.rpc('therapist_bulk_cancel_with_count', {
    p_therapist_id: therapistId,
    p_target_date: targetDate,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, affectedCount: data ?? 0 };
}
