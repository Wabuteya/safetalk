import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => null) as {
      student_id?: string;
      deletion_request_id?: string;
    } | null;

    const studentId = body?.student_id?.trim();
    const deletionRequestId = body?.deletion_request_id?.trim();

    if (!studentId || !deletionRequestId) {
      return new Response(JSON.stringify({ error: 'student_id and deletion_request_id are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const jwt = authHeader.slice(7);

    const {
      data: { user: caller },
      error: callerError,
    } = await supabaseAdmin.auth.getUser(jwt);

    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (caller.user_metadata?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (studentId === caller.id) {
      return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: reqRow, error: reqErr } = await supabaseAdmin
      .from('account_deletion_requests')
      .select('id, student_id, status')
      .eq('id', deletionRequestId)
      .maybeSingle();

    if (reqErr || !reqRow) {
      return new Response(JSON.stringify({ error: 'Deletion request not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (reqRow.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'This request is no longer pending' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (reqRow.student_id !== studentId) {
      return new Response(JSON.stringify({ error: 'Request does not match student' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: targetData, error: targetErr } = await supabaseAdmin.auth.admin.getUserById(studentId);

    if (targetErr || !targetData?.user) {
      return new Response(JSON.stringify({ error: 'Student account not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (targetData.user.user_metadata?.role !== 'student') {
      return new Response(JSON.stringify({ error: 'Target user is not a student' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(studentId);

    if (deleteErr) {
      console.error('deleteUser error:', deleteErr);
      return new Response(JSON.stringify({ error: deleteErr.message || 'Failed to delete user' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Student account deleted' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    console.error('admin-delete-student:', e);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
