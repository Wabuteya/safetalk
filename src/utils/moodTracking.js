import { supabase } from '../supabaseClient';

/** Predefined mood options for student selection. Do not use for risk or alerts. */
export const MOOD_OPTIONS = [
  { value: 'great', label: 'Great', emoji: '😄' },
  { value: 'good', label: 'Good', emoji: '🙂' },
  { value: 'okay', label: 'Okay', emoji: '😐' },
  { value: 'low', label: 'Low', emoji: '😔' },
  { value: 'difficult', label: 'Difficult', emoji: '😢' },
];

/** Numeric mood values for charts: 1=Difficult, 5=Great */
export const MOOD_VALUES = {
  difficult: 1,
  low: 2,
  okay: 3,
  good: 4,
  great: 5,
};

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

/**
 * Group mood entries by date range for display: Today, Yesterday, This week, Last week, This month, Last month, Older.
 * Returns array of { key, label, entries }.
 */
export function groupMoodEntriesByDate(entries) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const groups = [
    { key: 'today', label: 'Today', entries: [] },
    { key: 'yesterday', label: 'Yesterday', entries: [] },
    { key: 'thisWeek', label: 'This week', entries: [] },
    { key: 'lastWeek', label: 'Last week', entries: [] },
    { key: 'thisMonth', label: 'This month', entries: [] },
    { key: 'lastMonth', label: 'Last month', entries: [] },
    { key: 'older', label: 'Older', entries: [] },
  ];

  entries.forEach((entry) => {
    const d = new Date(entry.logged_at);
    const entryDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (entryDate >= todayStart) {
      groups[0].entries.push(entry);
    } else if (entryDate >= yesterdayStart) {
      groups[1].entries.push(entry);
    } else if (entryDate >= weekStart) {
      groups[2].entries.push(entry);
    } else if (entryDate >= lastWeekStart) {
      groups[3].entries.push(entry);
    } else if (entryDate >= new Date(now.getFullYear(), now.getMonth(), 1)) {
      groups[4].entries.push(entry);
    } else if (entryDate >= new Date(now.getFullYear(), now.getMonth() - 1, 1)) {
      groups[5].entries.push(entry);
    } else {
      groups[6].entries.push(entry);
    }
  });

  return groups.filter((g) => g.entries.length > 0);
}
