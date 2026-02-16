import { supabase } from '../supabaseClient';

/** Predefined mood options for student selection. Do not use for risk or alerts. */
export const MOOD_OPTIONS = [
  { value: 'great', label: 'Great' },
  { value: 'good', label: 'Good' },
  { value: 'okay', label: 'Okay' },
  { value: 'low', label: 'Low' },
  { value: 'difficult', label: 'Difficult' },
];

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Check if the student has any mood log in the past 24 hours (rolling, server time).
 * Used only to decide whether to show the optional mood prompt.
 */
export async function hasMoodInLast24Hours(studentId) {
  if (!studentId) return false;
  const since = new Date(Date.now() - TWENTY_FOUR_HOURS_MS).toISOString();
  const { data, error } = await supabase
    .from('mood_logs')
    .select('id')
    .eq('student_id', studentId)
    .gte('logged_at', since)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('moodTracking.hasMoodInLast24Hours:', error);
    return false;
  }
  return !!data;
}

/**
 * Save or update mood for the current 24-hour period.
 * At most one log per student per 24h: if one exists in the last 24h, overwrite it.
 */
export async function upsertMoodLog(studentId, mood, note = null) {
  if (!studentId || !mood) return { error: new Error('studentId and mood required') };
  const since = new Date(Date.now() - TWENTY_FOUR_HOURS_MS).toISOString();
  const { data: existing } = await supabase
    .from('mood_logs')
    .select('id')
    .eq('student_id', studentId)
    .gte('logged_at', since)
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
