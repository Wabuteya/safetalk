/**
 * Emotional Trends — Secure data access for therapist-only journal analysis.
 * RLS enforces therapist-student link; no journal text, no shared-status dependency.
 */

import { supabase } from '../supabaseClient';

/**
 * Fetch journal analysis for a student. Only returns analysis-level data.
 * Therapist must be linked via therapist_student_relations (enforced by RLS).
 *
 * @param {string} studentId - Student user ID
 * @returns {Promise<Array>} Rows with sadness_score, fear_score, joy_score, anger_score, derived_risk, created_at
 */
export async function fetchJournalAnalysisForStudent(studentId) {
  if (!studentId) return [];

  const { data, error } = await supabase
    .from('journal_analysis')
    .select('journal_id, sadness_score, fear_score, joy_score, anger_score, neutral_score, surprise_score, disgust_score, derived_risk, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching journal analysis:', error);
    return [];
  }

  return data || [];
}
