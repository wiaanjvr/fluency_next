// supabase/functions/vote-helpful/index.ts
// Deno Edge Function: Upserts a helpful vote on a review
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
    const { review_id } = body;

    if (!review_id) {
      return new Response(JSON.stringify({ error: "review_id is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already voted
    const { data: existing } = await supabase
      .from("community_review_votes")
      .select("id")
      .eq("review_id", review_id)
      .eq("voter_id", user.id)
      .maybeSingle();

    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (existing) {
      // Remove vote
      await supabase
        .from("community_review_votes")
        .delete()
        .eq("id", existing.id);

      await adminSupabase.rpc("decrement_helpful_votes", {
        p_review_id: review_id,
      });

      return new Response(JSON.stringify({ voted: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Add vote
      const { error: insertError } = await supabase
        .from("community_review_votes")
        .insert({ review_id, voter_id: user.id });

      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await adminSupabase.rpc("increment_helpful_votes", {
        p_review_id: review_id,
      });

      return new Response(JSON.stringify({ voted: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
