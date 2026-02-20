import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { verifyAdminSecret } from "@/lib/auth/verify-admin";
import {
  formatBottles,
  formatFields,
  notificationEmailBody,
} from "@/lib/format-impact";

/* =============================================================================
   IMPACT NOTIFICATION API ROUTE (ADMIN ONLY)

   POST /api/notifications/impact

   Finds all user_impact rows where notified_at IS NULL, joins with
   community_impact_summary for community totals, and sends a personalized
   email per user via Resend.

   Protected by x-admin-secret header.
============================================================================= */

const getServiceSupabase = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

export async function POST(request: NextRequest) {
  try {
    // ── Verify admin ────────────────────────────────────────────────────
    const adminError = verifyAdminSecret(request);
    if (adminError) return adminError;

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY not configured" },
        { status: 500 },
      );
    }

    const resend = new Resend(resendKey);
    const serviceSupabase = getServiceSupabase();

    // ── Fetch un-notified user_impact rows ──────────────────────────────
    const { data: pendingNotifications, error: fetchError } =
      await serviceSupabase
        .from("user_impact")
        .select(
          `
          id,
          user_id,
          bottles_allocated,
          fields_allocated,
          donation_id
        `,
        )
        .is("notified_at", null);

    if (fetchError) {
      console.error("Error fetching pending notifications:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch pending notifications" },
        { status: 500 },
      );
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return NextResponse.json({
        message: "No pending notifications",
        emails_sent: 0,
      });
    }

    // ── Fetch community stats ───────────────────────────────────────────
    const { data: communityStats } = await serviceSupabase
      .from("community_impact_summary")
      .select("*")
      .single();

    const communityFields = communityStats?.this_month_fields || 0;

    // ── Fetch user emails ───────────────────────────────────────────────
    const userIds = [...new Set(pendingNotifications.map((n) => n.user_id))];
    const { data: profiles } = await serviceSupabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

    // ── Send emails and mark as notified ────────────────────────────────
    let emailsSent = 0;
    let emailsFailed = 0;
    const notifiedIds: string[] = [];
    const fromAddress =
      process.env.RESEND_FROM_EMAIL || "Fluensea <noreply@fluensea.com>";

    for (const notification of pendingNotifications) {
      const profile = profileMap.get(notification.user_id);
      if (!profile?.email) {
        console.warn(
          `No email found for user ${notification.user_id} — skipping`,
        );
        emailsFailed++;
        continue;
      }

      const { subject, body } = notificationEmailBody({
        bottlesAllocated: notification.bottles_allocated,
        communityFields,
      });

      try {
        await resend.emails.send({
          from: fromAddress,
          to: [profile.email],
          subject,
          text: body,
        });

        notifiedIds.push(notification.id);
        emailsSent++;
      } catch (emailError) {
        console.error(`Failed to send email to ${profile.email}:`, emailError);
        emailsFailed++;
      }
    }

    // ── Mark all successfully notified rows ─────────────────────────────
    if (notifiedIds.length > 0) {
      const { error: updateError } = await serviceSupabase
        .from("user_impact")
        .update({ notified_at: new Date().toISOString() })
        .in("id", notifiedIds);

      if (updateError) {
        console.error("Error updating notified_at:", updateError);
      }
    }

    return NextResponse.json({
      message: `Sent ${emailsSent} notification email(s)`,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
    });
  } catch (error) {
    console.error("Impact notification error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
