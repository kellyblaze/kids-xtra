import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import webpush from "web-push";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { parseOnboardingState } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = authorizeCronRequest(request);
  if (authError) return authError;

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL;
  if (!vapidPublic || !vapidPrivate || !vapidEmail) {
    return NextResponse.json(
      { error: "VAPID not configured" },
      { status: 500 },
    );
  }

  webpush.setVapidDetails(`mailto:${vapidEmail}`, vapidPublic, vapidPrivate);

  const admin = createAdminClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();
  const tomorrowIso = new Date(
    today.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: families } = await admin
    .from("families")
    .select("id, settings");
  if (!families?.length) return NextResponse.json({ sent: 0 });

  let totalSent = 0;

  for (const family of families) {
    if (!parseOnboardingState(family.settings).preferences.choreReminders)
      continue;

    const [{ data: assignments }, { data: completionsToday }] =
      await Promise.all([
        admin
          .from("chore_assignments")
          .select(
            "child_id, child_profiles(name, family_id), chores(id, title, period_unit, is_active)",
          )
          .eq("family_id", family.id)
          .eq("is_active", true),
        admin
          .from("chore_completions")
          .select("chore_assignments(chore_id)")
          .eq("family_id", family.id)
          .gte("completed_at", todayIso)
          .lt("completed_at", tomorrowIso),
      ]);

    const completedChoreIds = new Set(
      (completionsToday ?? []).flatMap((c) => {
        const a = Array.isArray(c.chore_assignments)
          ? c.chore_assignments[0]
          : c.chore_assignments;
        return (a as { chore_id?: string } | null)?.chore_id
          ? [(a as { chore_id: string }).chore_id]
          : [];
      }),
    );

    const overdueChores = (assignments ?? []).filter((a) => {
      const chore = Array.isArray(a.chores) ? a.chores[0] : a.chores;
      const child = Array.isArray(a.child_profiles)
        ? a.child_profiles[0]
        : a.child_profiles;
      return (
        (
          chore as {
            is_active?: boolean;
            period_unit?: string;
            id?: string;
          } | null
        )?.is_active &&
        (chore as { period_unit?: string } | null)?.period_unit === "day" &&
        (child as { family_id?: string } | null)?.family_id === family.id &&
        !completedChoreIds.has((chore as { id?: string } | null)?.id ?? "")
      );
    });

    if (!overdueChores.length) continue;

    const { data: subscriptions } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("family_id", family.id);

    if (!subscriptions?.length) continue;

    const overdueNames = [
      ...new Set(
        overdueChores.map((a) => {
          const chore = Array.isArray(a.chores) ? a.chores[0] : a.chores;
          return (chore as { title?: string } | null)?.title ?? "a Mission";
        }),
      ),
    ].slice(0, 3);

    const body =
      overdueNames.length === 1
        ? `${overdueNames[0]} is still waiting as today's Mission.`
        : `${overdueNames.slice(0, -1).join(", ")} and more Missions are still waiting today.`;

    const payload = JSON.stringify({
      title: "Mission reminder",
      body,
      url: "/parent/approvals",
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush
          .sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          )
          .then(() => {
            totalSent++;
          }),
      ),
    );
    const expiredEndpoints = results.flatMap((result, index) => {
      if (result.status !== "rejected") return [];
      const statusCode = (result.reason as { statusCode?: number } | null)
        ?.statusCode;
      return statusCode === 404 || statusCode === 410
        ? [subscriptions[index].endpoint]
        : [];
    });
    if (expiredEndpoints.length) {
      await admin
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    }
  }

  return NextResponse.json({ sent: totalSent });
}
