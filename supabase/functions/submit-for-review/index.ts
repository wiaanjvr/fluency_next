// supabase/functions/submit-for-review/index.ts
// Deno Edge Function: Validates and creates a community submission
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
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

    // Verify auth
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
    const { exercise_type, prompt, content, audio_url, language } = body;

    // Validate exercise_type
    if (!["writing", "speaking", "translation"].includes(exercise_type)) {
      return new Response(
        JSON.stringify({
          error:
            "Invalid exercise_type. Must be writing, speaking, or translation.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate content requirements
    if (exercise_type === "writing" || exercise_type === "translation") {
      if (!content || content.trim().length < 50) {
        return new Response(
          JSON.stringify({ error: "Content must be at least 50 characters." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (content.length > 500) {
        return new Response(
          JSON.stringify({ error: "Content must be at most 500 characters." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    if (exercise_type === "speaking" && !audio_url) {
      return new Response(
        JSON.stringify({
          error: "Audio URL is required for speaking submissions.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get user profile for defaults + tier check
    const { data: profile } = await supabase
      .from("profiles")
      .select("target_language, subscription_tier")
      .eq("id", user.id)
      .single();

    const effectiveLanguage = language || profile?.target_language || "fr";

    // Check open submission limit based on tier
    const maxOpen = profile?.subscription_tier === "snorkeler" ? 3 : 10;
    const { count } = await supabase
      .from("community_submissions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "open");

    if ((count ?? 0) >= maxOpen) {
      return new Response(
        JSON.stringify({
          error: `Maximum of ${maxOpen} open submissions reached. Upgrade for more slots.`,
          remaining: 0,
          max: maxOpen,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Insert submission
    const { data: submission, error: insertError } = await supabase
      .from("community_submissions")
      .insert({
        user_id: user.id,
        language: effectiveLanguage,
        exercise_type,
        prompt: prompt ?? null,
        content: content ?? null,
        audio_url: audio_url ?? null,
      })
      .select(
        `*, profiles:user_id (id, full_name, avatar_url, target_language, native_language)`,
      )
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        submission,
        remaining: maxOpen - ((count ?? 0) + 1),
        max: maxOpen,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
