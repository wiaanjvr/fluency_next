// supabase/functions/submit-review/index.ts
// Deno Edge Function: Validates and creates a community review
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      submission_id,
      corrected_text,
      inline_corrections,
      overall_feedback,
      rating,
    } = body;

    if (!submission_id) {
      return new Response(
        JSON.stringify({ error: "submission_id is required." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!rating || rating < 1 || rating > 5) {
      return new Response(
        JSON.stringify({ error: "Rating must be between 1 and 5." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Fetch the submission to validate ownership
    const { data: submission, error: fetchError } = await supabase
      .from("community_submissions")
      .select("user_id, exercise_type")
      .eq("id", submission_id)
      .single();

    if (fetchError || !submission) {
      return new Response(JSON.stringify({ error: "Submission not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (submission.user_id === user.id) {
      return new Response(
        JSON.stringify({ error: "You cannot review your own submission." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Insert review
    const { data: review, error: insertError } = await supabase
      .from("community_reviews")
      .insert({
        submission_id,
        reviewer_id: user.id,
        corrected_text: corrected_text ?? null,
        inline_corrections: inline_corrections ?? null,
        overall_feedback: overall_feedback ?? null,
        rating,
      })
      .select(
        `*, profiles:reviewer_id (id, full_name, avatar_url, target_language, native_language)`,
      )
      .single();

    if (insertError) {
      // Likely a unique constraint violation (already reviewed)
      if (insertError.code === "23505") {
        return new Response(
          JSON.stringify({
            error: "You have already reviewed this submission.",
          }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client for privileged operations
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Increment review_count and update status
    await adminSupabase.rpc("increment_review_count", {
      p_submission_id: submission_id,
    });

    // Award XP to reviewer (5 for writing/translation, 8 for speaking)
    const xpAward = submission.exercise_type === "speaking" ? 8 : 5;
    await adminSupabase.rpc("award_community_xp", {
      p_user_id: user.id,
      p_xp: xpAward,
    });

    return new Response(JSON.stringify({ review, xp_awarded: xpAward }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
