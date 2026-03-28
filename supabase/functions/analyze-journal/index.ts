/**
 * Background journal analysis Edge Function
 * Invoked by Supabase Database Webhook on journal_entries INSERT
 *
 * Payload: { type, table, record: { id, student_id, content, ... } }
 * Updates journal_analysis with emotion scores (placeholder; add ML API integration as needed)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { type, table, record } = payload;

    const isJournalInsert =
      (table === 'journal_entries' || table === 'journal_entries_enc') &&
      type === 'INSERT' &&
      record?.id;
    if (!isJournalInsert) {
      return new Response(
        JSON.stringify({ message: 'Ignored: not a journal entry INSERT' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const journalId = record.id;
    const studentId = record.student_id;
    const content = (record.content || '').toLowerCase();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Optional: Call external sentiment API here (OpenAI, Hugging Face, etc.)
    // For now, use simple heuristic based on word presence
    const scores = computePlaceholderScores(content);

    const { error } = await supabaseAdmin
      .from('journal_analysis')
      .update({
        sadness_score: scores.sadness,
        fear_score: scores.fear,
        anger_score: scores.anger,
        joy_score: scores.joy,
        neutral_score: scores.neutral,
        surprise_score: scores.surprise,
        disgust_score: scores.disgust,
      })
      .eq('journal_id', journalId);

    if (error) {
      console.error('Journal analysis update error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, journal_id: journalId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err) {
    console.error('analyze-journal error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function computePlaceholderScores(content: string): Record<string, number> {
  const words = content.split(/\s+/).filter(Boolean);
  const len = Math.max(words.length, 1);
  const has = (terms: string[]) => terms.some((t) => content.includes(t));

  const sadness = has(['sad', 'depressed', 'lonely', 'hopeless', 'crying']) ? 0.6 : 0.1;
  const fear = has(['scared', 'afraid', 'anxious', 'worried', 'panic']) ? 0.5 : 0.1;
  const anger = has(['angry', 'mad', 'frustrated', 'hate']) ? 0.5 : 0.1;
  const joy = has(['happy', 'great', 'excited', 'love', 'amazing']) ? 0.5 : 0.1;
  const surprise = 0.1;
  const disgust = 0.1;
  const neutral = 1 - (sadness + fear + anger + joy + surprise + disgust) / 6;

  return {
    sadness: Math.max(0, Math.min(1, sadness)),
    fear: Math.max(0, Math.min(1, fear)),
    anger: Math.max(0, Math.min(1, anger)),
    joy: Math.max(0, Math.min(1, joy)),
    neutral: Math.max(0, Math.min(1, neutral)),
    surprise: Math.max(0, Math.min(1, surprise)),
    disgust: Math.max(0, Math.min(1, disgust)),
  };
}
