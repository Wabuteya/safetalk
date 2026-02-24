import { supabase } from '../supabaseClient';

const ACKNOWLEDGEMENT_WINDOW_MINUTES = 5;

/** Status order for urgency: triggered > escalated > acknowledged > in_progress (resolved excluded) */
const STATUS_ORDER = { triggered: 0, escalated: 1, active: 2, acknowledged: 3, in_progress: 4, resolved: 5 };

function logCrisisRouting(crisisEventId, action, therapistId, details = null) {
  return supabase.from('crisis_routing_log').insert({
    crisis_event_id: crisisEventId,
    action,
    therapist_id: therapistId || null,
    details: details || null,
  });
}

/**
 * Escalate all crises that have passed their acknowledgement deadline. Sets routed_to_on_call_at when escalating.
 */
export async function escalateExpiredCrises() {
  const now = new Date().toISOString();
  await supabase
    .from('crisis_events')
    .update({
      status: 'escalated',
      escalated_at: now,
      unacknowledged: true,
      routed_to_on_call_at: now,
    })
    .eq('status', 'triggered')
    .lt('acknowledgement_due_at', now);
}

export async function isOnCallTherapist(therapistId) {
  if (!therapistId) return false;
  const { data, error } = await supabase
    .from('on_call_pool')
    .select('therapist_id')
    .eq('therapist_id', therapistId)
    .maybeSingle();
  return !error && !!data;
}

/**
 * Check if therapist is handling an active (non-resolved) crisis for this student.
 * Used to grant temporary case access for on-pool therapists.
 */
export async function isHandlingActiveCrisisForStudent(therapistId, studentId) {
  if (!therapistId || !studentId) return false;
  const { data, error } = await supabase
    .from('crisis_events')
    .select('id')
    .eq('student_id', studentId)
    .eq('handled_by_id', therapistId)
    .neq('status', 'resolved')
    .maybeSingle();
  return !error && !!data;
}

/**
 * Fetch non-resolved crisis events for a therapist (own caseload + on-call pool if in pool).
 * Escalates all expired triggered crises first. Returns { events, isOnCall }.
 */
export async function getCrisisEventsForTherapist(therapistId) {
  if (!therapistId) return { events: [], isOnCall: false };
  await escalateExpiredCrises();
  const isOnCall = await isOnCallTherapist(therapistId);

  const { data: primaryEvents, error: primaryError } = await supabase
    .from('crisis_events')
    .select('id, student_id, therapist_id, handled_by_id, status, source, triggered_at, acknowledgement_due_at, acknowledged_at, escalated_at, unacknowledged, routed_to_on_call_at, resolved_at')
    .eq('therapist_id', therapistId)
    .in('status', ['active', 'triggered', 'acknowledged', 'in_progress', 'escalated'])
    .order('triggered_at', { ascending: false });

  let onCallEvents = [];
  if (isOnCall) {
    const { data: onCall } = await supabase
      .from('crisis_events')
      .select('id, student_id, therapist_id, handled_by_id, status, source, triggered_at, acknowledgement_due_at, acknowledged_at, escalated_at, unacknowledged, routed_to_on_call_at, resolved_at')
      .not('routed_to_on_call_at', 'is', null)
      .neq('status', 'resolved')
      .or(`handled_by_id.eq.${therapistId},handled_by_id.is.null`)
      .order('triggered_at', { ascending: false });
    onCallEvents = onCall || [];
  }

  const primaryIds = new Set((primaryEvents || []).map((e) => e.id));
  const merged = [...(primaryEvents || [])];
  for (const e of onCallEvents) {
    if (!primaryIds.has(e.id)) merged.push(e);
  }

  if (merged.length === 0) return { events: [], isOnCall };

  const studentIds = [...new Set(merged.map((e) => e.student_id))];
  const { data: profiles } = await supabase
    .from('student_profiles')
    .select('user_id, alias')
    .in('user_id', studentIds);

  const aliasByStudent = (profiles || []).reduce((acc, p) => {
    acc[p.user_id] = p.alias || `Student`;
    return acc;
  }, {});

  const withAlias = merged.map((e) => ({
    ...e,
    studentAlias: aliasByStudent[e.student_id] || 'Student',
    isOnCallPool: !!e.routed_to_on_call_at && e.therapist_id !== therapistId,
  }));

  withAlias.sort((a, b) => {
    const orderA = STATUS_ORDER[a.status] ?? 6;
    const orderB = STATUS_ORDER[b.status] ?? 6;
    if (orderA !== orderB) return orderA - orderB;
    return new Date(b.triggered_at) - new Date(a.triggered_at);
  });

  return { events: withAlias, isOnCall };
}

/**
 * Fetch all crisis events for a therapist (caseload + on-call), including resolved.
 * For use on the Crisis Alerts page. Returns events with studentAlias, assignedTherapistName, displayStatus.
 */
export async function getCrisisEventsForTherapistAll(therapistId) {
  if (!therapistId) return [];
  await escalateExpiredCrises();
  const isOnCall = await isOnCallTherapist(therapistId);

  const { data: primaryEvents } = await supabase
    .from('crisis_events')
    .select('id, student_id, therapist_id, handled_by_id, status, source, triggered_at, acknowledgement_due_at, acknowledged_at, escalated_at, unacknowledged, routed_to_on_call_at, resolved_at')
    .eq('therapist_id', therapistId)
    .order('triggered_at', { ascending: false });

  let onCallEvents = [];
  if (isOnCall) {
    const { data: onCall } = await supabase
      .from('crisis_events')
      .select('id, student_id, therapist_id, handled_by_id, status, source, triggered_at, acknowledgement_due_at, acknowledged_at, escalated_at, unacknowledged, routed_to_on_call_at, resolved_at')
      .not('routed_to_on_call_at', 'is', null)
      .neq('status', 'resolved')
      .or(`handled_by_id.eq.${therapistId},handled_by_id.is.null`)
      .order('triggered_at', { ascending: false });
    onCallEvents = onCall || [];
  }

  const primaryIds = new Set((primaryEvents || []).map((e) => e.id));
  const merged = [...(primaryEvents || [])];
  for (const e of onCallEvents) {
    if (!primaryIds.has(e.id)) merged.push(e);
  }

  if (merged.length === 0) return [];

  const studentIds = [...new Set(merged.map((e) => e.student_id))];
  const therapistIds = [...new Set(merged.flatMap((e) => [e.therapist_id, e.handled_by_id].filter(Boolean)))];

  const [profilesRes, therapistsRes] = await Promise.all([
    supabase.from('student_profiles').select('user_id, alias').in('user_id', studentIds),
    supabase.from('therapist_profiles').select('user_id, full_name').in('user_id', therapistIds),
  ]);

  const aliasByStudent = (profilesRes.data || []).reduce((acc, p) => {
    acc[p.user_id] = p.alias || 'Student';
    return acc;
  }, {});
  const nameByTherapist = (therapistsRes.data || []).reduce((acc, p) => {
    acc[p.user_id] = p.full_name || 'Therapist';
    return acc;
  }, {});

  const displayStatus = (status) => {
    if (status === 'resolved') return 'Resolved';
    if (['acknowledged', 'in_progress'].includes(status)) return 'Acknowledged';
    return 'Active';
  };

  const withMeta = merged.map((e) => {
    const isOnCallPool = !!e.routed_to_on_call_at && e.therapist_id !== therapistId;
    const assignedId = e.handled_by_id || e.therapist_id;
    const assignedTherapistName = assignedId ? (nameByTherapist[assignedId] || 'Therapist') : (isOnCallPool && !e.handled_by_id ? 'Unassigned' : nameByTherapist[e.therapist_id] || 'Therapist');
    return {
      ...e,
      studentAlias: aliasByStudent[e.student_id] || 'Student',
      isOnCallPool,
      assignedTherapistName: isOnCallPool && !e.handled_by_id ? 'Unassigned' : (nameByTherapist[assignedId] || 'Therapist'),
      displayStatus: displayStatus(e.status),
    };
  });

  withMeta.sort((a, b) => {
    const resolvedA = a.status === 'resolved' ? 1 : 0;
    const resolvedB = b.status === 'resolved' ? 1 : 0;
    if (resolvedA !== resolvedB) return resolvedA - resolvedB;
    if (resolvedA) return new Date(b.resolved_at || 0) - new Date(a.resolved_at || 0);
    const orderA = STATUS_ORDER[a.status] ?? 6;
    const orderB = STATUS_ORDER[b.status] ?? 6;
    if (orderA !== orderB) return orderA - orderB;
    return new Date(b.triggered_at) - new Date(a.triggered_at);
  });

  return withMeta;
}

/**
 * Acknowledge a crisis. Primary (if not expired) or first on-call therapist sets handled_by_id and acknowledged.
 */
export async function acknowledgeCrisisEvent(eventId, therapistId) {
  if (!eventId || !therapistId) return { error: new Error('Missing eventId or therapistId') };
  const now = new Date().toISOString();

  const { data: existing, error: fetchError } = await supabase
    .from('crisis_events')
    .select('id, therapist_id, handled_by_id, status, acknowledgement_due_at, routed_to_on_call_at')
    .eq('id', eventId)
    .single();

  if (fetchError || !existing) return { error: fetchError || new Error('Crisis not found') };

  const isPrimary = existing.therapist_id === therapistId;
  const canAckPrimary = isPrimary && ['triggered', 'active'].includes(existing.status) &&
    (!existing.acknowledgement_due_at || existing.acknowledgement_due_at >= now);
  const canAckOnCall = existing.routed_to_on_call_at &&
    (existing.handled_by_id === null || existing.handled_by_id === therapistId) &&
    ['triggered', 'escalated'].includes(existing.status);

  if (!canAckPrimary && !canAckOnCall)
    return { error: new Error('You cannot acknowledge this crisis') };

  const updates = {
    status: 'acknowledged',
    acknowledged_at: now,
    handled_by_id: existing.handled_by_id || therapistId,
  };

  const { data, error } = await supabase
    .from('crisis_events')
    .update(updates)
    .eq('id', eventId)
    .select()
    .single();

  if (!error) {
    await logCrisisRouting(eventId, 'acknowledged_by', therapistId, existing.handled_by_id ? null : 'handler_assigned');
  }
  return error ? { error } : { data, error: null };
}

/**
 * Resolve a crisis. Allowed for primary or current handler.
 */
export async function resolveCrisisEvent(eventId, therapistId) {
  if (!eventId || !therapistId) return { error: new Error('Missing eventId or therapistId') };

  const { data: existing, error: fetchError } = await supabase
    .from('crisis_events')
    .select('id, therapist_id, handled_by_id')
    .eq('id', eventId)
    .single();

  if (fetchError || !existing) return { error: fetchError || new Error('Crisis not found') };
  if (existing.therapist_id !== therapistId && existing.handled_by_id !== therapistId)
    return { error: new Error('Not authorized to resolve this crisis') };

  const { data, error } = await supabase
    .from('crisis_events')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .select()
    .single();
  return error ? { error } : { data, error: null };
}

/**
 * Set status to in_progress. Allowed for primary or current handler.
 */
export async function setCrisisInProgress(eventId, therapistId) {
  if (!eventId || !therapistId) return { error: new Error('Missing eventId or therapistId') };

  const { data: existing, error: fetchError } = await supabase
    .from('crisis_events')
    .select('id, therapist_id, handled_by_id')
    .eq('id', eventId)
    .single();

  if (fetchError || !existing) return { error: fetchError || new Error('Crisis not found') };
  if (existing.therapist_id !== therapistId && existing.handled_by_id !== therapistId)
    return { error: new Error('Not authorized') };

  const { error } = await supabase
    .from('crisis_events')
    .update({ status: 'in_progress' })
    .eq('id', eventId);
  return { error: error || null };
}

/**
 * Create a new crisis event. If primary therapist is away/offline, route to on-call pool.
 */
export async function createCrisisEvent(studentId, therapistId, source = null) {
  if (!studentId || !therapistId) return { error: new Error('Missing studentId or therapistId') };

  const { data: profile } = await supabase
    .from('therapist_profiles')
    .select('status')
    .eq('user_id', therapistId)
    .maybeSingle();

  const primaryAvailable = profile?.status === 'online';
  const triggeredAt = new Date();
  const dueAt = new Date(triggeredAt.getTime() + ACKNOWLEDGEMENT_WINDOW_MINUTES * 60 * 1000);

  const insertRow = {
    student_id: studentId,
    therapist_id: therapistId,
    status: 'triggered',
    source: source || null,
    triggered_at: triggeredAt.toISOString(),
    acknowledgement_due_at: dueAt.toISOString(),
    routed_to_on_call_at: primaryAvailable ? null : triggeredAt.toISOString(),
  };

  const { data, error } = await supabase
    .from('crisis_events')
    .insert(insertRow)
    .select()
    .single();

  if (error) return { error };

  await logCrisisRouting(data.id, 'created', therapistId, primaryAvailable ? 'routed_to_primary' : 'primary_unavailable');
  if (!primaryAvailable)
    await logCrisisRouting(data.id, 'routed_to_on_call', null, 'primary_away_or_offline');

  return { data, error: null };
}
