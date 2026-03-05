/**
 * analyzeJournalEntry — Background journal analysis Edge Function
 *
 * Accepts journal_id as input. Fetches journal from journal_entries, performs
 * keyword detection, calls Hugging Face emotion model, derives risk, inserts
 * into journal_analysis. If derived_risk = high, triggers crisis creation.
 *
 * Invocation:
 * - Direct: POST body { journal_id: "uuid" }
 * - Database Webhook: { type, table, record } — extracts record.id as journal_id
 *
 * Must run asynchronously; do not await in frontend.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const HF_MODEL = 'j-hartmann/emotion-english-distilroberta-base';
const SUICIDE_PHRASES = [
  'kill myself',
  'killing myself',
  'killing my self',
  'suicide',
  'end my life',
  'end it all',
  'self harm',
  'self-harm',
  'better off dead',
  "don't want to live",
  "dont want to live",
  'hurt myself',
  'not worth living',
];

function hasSuicideKeyword(content: string): boolean {
  const lower = (content || '').toLowerCase();
  return SUICIDE_PHRASES.some((phrase) => lower.includes(phrase));
}

function deriveRisk(
  keywordFlag: boolean,
  sadness: number,
  fear: number
): 'high' | 'medium' | 'low' {
  if (keywordFlag) return 'high';
  if (sadness > 0.8 && fear > 0.6) return 'high';
  if (sadness > 0.65) return 'medium';
  return 'low';
}

/** Map dominant emotion (sadness, fear, anger) to resource category */
function emotionToCategory(
  emotion: 'sadness' | 'fear' | 'anger'
): 'depression' | 'anxiety' | 'emotional_regulation' | 'stress_management' {
  const map: Record<string, 'depression' | 'anxiety' | 'emotional_regulation'> = {
    sadness: 'depression',
    fear: 'anxiety',
    anger: 'emotional_regulation',
  };
  return map[emotion] ?? 'stress_management';
}

/** Get dominant emotion among sadness, fear, anger */
function getDominantEmotion(sadness: number, fear: number, anger: number): 'sadness' | 'fear' | 'anger' {
  const scores = [
    { emotion: 'sadness' as const, score: sadness },
    { emotion: 'fear' as const, score: fear },
    { emotion: 'anger' as const, score: anger },
  ];
  scores.sort((a, b) => b.score - a.score);
  return scores[0].emotion;
}

async function fetchEmotionScores(
  content: string,
  hfToken: string
): Promise<Record<string, number>> {
  const text = (content || '').trim();
  if (!text) {
    return {
      sadness: 0.1,
      fear: 0.1,
      anger: 0.1,
      joy: 0.1,
      neutral: 0.6,
      surprise: 0.1,
      disgust: 0.1,
    };
  }

  const res = await fetch(
    `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: text.slice(0, 512),
        parameters: { top_k: 7 },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error('HF API error:', res.status, errText);
    return {
      sadness: 0.1,
      fear: 0.1,
      anger: 0.1,
      joy: 0.1,
      neutral: 0.6,
      surprise: 0.1,
      disgust: 0.1,
    };
  }

  const data = await res.json();
  const scores: Record<string, number> = {
    sadness: 0.1,
    fear: 0.1,
    anger: 0.1,
    joy: 0.1,
    neutral: 0.1,
    surprise: 0.1,
    disgust: 0.1,
  };

  if (Array.isArray(data) && data.length > 0) {
    const arr = Array.isArray(data[0]) ? data[0] : data;
    for (const item of arr) {
      if (item?.label && typeof item.score === 'number') {
        scores[item.label] = item.score;
      }
    }
  } else if (data?.label && typeof data.score === 'number') {
    scores[data.label] = data.score;
  }

  return scores;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    let journalId: string | null = null;

    if (payload?.journal_id) {
      journalId = payload.journal_id;
    } else if (payload?.table === 'journal_entries' && payload?.type === 'INSERT' && payload?.record?.id) {
      journalId = payload.record.id;
    }

    if (!journalId) {
      return new Response(
        JSON.stringify({ message: 'Missing journal_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const hfToken = Deno.env.get('HUGGINGFACE_ACCESS_TOKEN') ?? '';

    const { data: journal, error: fetchErr } = await supabaseAdmin
      .from('journal_entries')
      .select('id, student_id, content')
      .eq('id', journalId)
      .single();

    if (fetchErr || !journal) {
      console.error('Journal fetch error:', fetchErr);
      return new Response(
        JSON.stringify({ error: 'Journal not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const content = journal.content || '';
    const keywordFlag = hasSuicideKeyword(content);

    const scores = hfToken
      ? await fetchEmotionScores(content, hfToken)
      : {
          sadness: 0.1,
          fear: 0.1,
          anger: 0.1,
          joy: 0.1,
          neutral: 0.6,
          surprise: 0.1,
          disgust: 0.1,
        };

    const derivedRisk = deriveRisk(
      keywordFlag,
      scores.sadness,
      scores.fear
    );

    const { error: insertErr } = await supabaseAdmin.from('journal_analysis').upsert(
      {
        journal_id: journal.id,
        student_id: journal.student_id,
        sadness_score: scores.sadness,
        fear_score: scores.fear,
        anger_score: scores.anger,
        joy_score: scores.joy,
        neutral_score: scores.neutral,
        surprise_score: scores.surprise,
        disgust_score: scores.disgust,
        keyword_flag: keywordFlag,
        derived_risk: derivedRisk,
      },
      { onConflict: 'journal_id' }
    );

    if (insertErr) {
      console.error('Journal analysis upsert error:', insertErr);
      return new Response(
        JSON.stringify({ error: insertErr.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (derivedRisk === 'high') {
      const { data: crisisId, error: crisisErr } = await supabaseAdmin.rpc(
        'create_crisis_from_source',
        { p_student_id: journal.student_id, p_source: 'journal_analysis' }
      );
      if (crisisErr) {
        console.error('Crisis creation error:', crisisErr);
      } else if (crisisId) {
        console.log('Crisis created:', crisisId);
      }
      // HIGH risk: crisis only, no resource recommendations
    } else if (derivedRisk === 'medium') {
      // Medium risk: dynamic resource recommendations based on dominant emotion
      const dominantEmotion = getDominantEmotion(scores.sadness, scores.fear, scores.anger);
      const mappedCategory = emotionToCategory(dominantEmotion);

      const { data: relation } = await supabaseAdmin
        .from('therapist_student_relations')
        .select('therapist_id')
        .eq('student_id', journal.student_id)
        .limit(1)
        .maybeSingle();
      const assignedTherapistId = relation?.therapist_id ?? null;

      const [systemRes, therapistAllRes, therapistAttachedRes] = await Promise.all([
        supabaseAdmin
          .from('resources')
          .select('id')
          .eq('category', mappedCategory)
          .eq('visibility_scope', 'system')
          .limit(3),
        supabaseAdmin
          .from('resources')
          .select('id')
          .eq('category', mappedCategory)
          .eq('visibility_scope', 'therapist_all')
          .limit(3),
        assignedTherapistId
          ? supabaseAdmin
              .from('resources')
              .select('id')
              .eq('category', mappedCategory)
              .eq('visibility_scope', 'therapist_attached')
              .eq('therapist_id', assignedTherapistId)
              .limit(3)
          : { data: [] as { id: string }[] },
      ]);

      const seen = new Set<string>();
      const resources: { id: string }[] = [];
      const attachedData = assignedTherapistId
        ? (therapistAttachedRes as { data?: { id: string }[] }).data || []
        : [];
      for (const r of [...(systemRes.data || []), ...(therapistAllRes.data || []), ...attachedData]) {
        if (!seen.has(r.id) && resources.length < 3) {
          seen.add(r.id);
          resources.push(r);
        }
      }
      const resErr = systemRes.error || therapistAllRes.error;

      if (!resErr && resources && resources.length > 0) {
        await supabaseAdmin
          .from('journal_recommendations')
          .delete()
          .eq('journal_id', journal.id);

        const rows = resources.map((r) => ({
          journal_id: journal.id,
          student_id: journal.student_id,
          resource_id: r.id,
        }));
        const { error: recErr } = await supabaseAdmin
          .from('journal_recommendations')
          .insert(rows);
        if (recErr) {
          console.error('Journal recommendations insert error:', recErr);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, journal_id: journalId, derived_risk: derivedRisk }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err) {
    console.error('analyze-journal-entry error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
