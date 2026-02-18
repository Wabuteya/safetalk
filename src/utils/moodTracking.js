import { supabase } from '../supabaseClient';

/** Predefined mood options for student selection. Do not use for risk or alerts. */
export const MOOD_OPTIONS = [
  { value: 'great', label: 'Great' },
  { value: 'good', label: 'Good' },
  { value: 'okay', label: 'Okay' },
  { value: 'low', label: 'Low' },
  { value: 'difficult', label: 'Difficult' },
];

/** Start of today in UTC (YYYY-MM-DD 00:00:00Z) */
function getStartOfTodayUTC() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

/** Start of tomorrow in UTC */
function getStartOfTomorrowUTC() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)).toISOString();
}

/**
 * Check if the student has any mood log for today (calendar day, UTC).
 * Used only to decide whether to show the optional mood prompt.
 * If mood logged today, do not prompt again for that day.
 */
export async function hasMoodLoggedToday(studentId) {
  if (!studentId) return false;
  const startOfToday = getStartOfTodayUTC();
  const startOfTomorrow = getStartOfTomorrowUTC();
  const { data, error } = await supabase
    .from('mood_logs')
    .select('id')
    .eq('student_id', studentId)
    .gte('logged_at', startOfToday)
    .lt('logged_at', startOfTomorrow)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('moodTracking.hasMoodLoggedToday:', error);
    return false;
  }
  return !!data;
}

/**
 * Save or update mood for today (calendar day, UTC).
 * At most one log per student per day: if one exists today, overwrite it.
 */
export async function upsertMoodLog(studentId, mood, note = null) {
  if (!studentId || !mood) return { error: new Error('studentId and mood required') };
  const startOfToday = getStartOfTodayUTC();
  const startOfTomorrow = getStartOfTomorrowUTC();
  const { data: existing } = await supabase
    .from('mood_logs')
    .select('id')
    .eq('student_id', studentId)
    .gte('logged_at', startOfToday)
    .lt('logged_at', startOfTomorrow)
    .order('logged_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('mood_logs')
      .update({ mood, note, logged_at: new Date().toISOString() })
      .eq('id', existing.id);
    return { error: error || null };
  }

  const { error } = await supabase.from('mood_logs').insert({
    student_id: studentId,
    mood,
    note: note && note.trim() ? note.trim() : null,
    logged_at: new Date().toISOString(),
  });
  return { error: error || null };
}

/**
 * Get the most recent mood log for a student (for dashboard display).
 */
export async function getLatestMood(studentId) {
  if (!studentId) return null;
  const { data, error } = await supabase
    .from('mood_logs')
    .select('id, mood, note, logged_at')
    .eq('student_id', studentId)
    .order('logged_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('moodTracking.getLatestMood:', error);
    return null;
  }
  return data;
}

/**
 * Get mood history for a student (for trends / history view).
 * Limit to recent entries (e.g. last 90 days).
 */
export async function getMoodHistory(studentId, limit = 90) {
  if (!studentId) return [];
  const { data, error } = await supabase
    .from('mood_logs')
    .select('id, mood, note, logged_at')
    .eq('student_id', studentId)
    .order('logged_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('moodTracking.getMoodHistory:', error);
    return [];
  }
  return data || [];
}
