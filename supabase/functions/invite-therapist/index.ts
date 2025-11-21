import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle preflight OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get email and full_name from the request body
    const { email, full_name } = await req.json();

    // Create a special admin client to perform protected actions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the redirect URL from environment or use default
    // This should match your app's URL (e.g., http://localhost:5173 for Vite dev server)
    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173';
    const redirectTo = `${siteUrl}/set-password`;

    // This is the core action: invite the user by email.
    // Supabase will handle sending the invitation.
    const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        role: 'therapist', // Assign the role in the metadata
        full_name: full_name // Also store the full name in metadata
      },
      redirectTo: redirectTo // Set where to redirect after email confirmation
    });

    if (inviteError) throw inviteError;

    // Now, create the corresponding public profile in our therapist_profiles table
    const userId = data.user.id;
    const { error: profileError } = await supabaseAdmin
      .from('therapist_profiles')
      .insert({
        user_id: userId,
        full_name: full_name,
        email: email,       // Populate the email field
        is_live: false      // Default to not live
      });
    
    if (profileError) throw profileError;

    // Send a success response back to the browser
    return new Response(JSON.stringify({ message: `Invitation successfully sent to ${email}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // Send an error response if anything fails
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});