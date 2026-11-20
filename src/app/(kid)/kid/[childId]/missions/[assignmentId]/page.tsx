export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Star,
} from "lucide-react";
import { authorizeChildAccess } from "@/lib/kid-authorization";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMissionState, type MissionCompletionStatus } from "@/lib/mission-product";
import { CATEGORY_EMOJI } from "@/lib/constants";
import { getLocalDateKey, zonedDateTimeToUtc } from "@/lib/reminders";
import { MissionStartControls } from "@/components/kid/MissionStartControls";

interface PageProps {
  params: Promise<{ childId: string; assignmentId: string }>;
}

export default async function MissionDetailPage({ params }: PageProps) {
  const { childId, assignmentId } = await params;

  const authorization = await authorizeChildAccess(childId);
  if (!authorization) redirect("/kids");

  const admin = createAdminClient();

  const [{ data: assignment }, { data: settings }] = await Promise.all([
    admin
      .from("chore_assignments")
      .select(
        "id, chores(id, title, description, credit_value, category, due_time, requires_photo, checklist_items, times_per_period, period_unit, reminder_enabled, reminder_follow_up_minutes)",
      )
      .eq("id", assignmentId)
      .eq("child_id", childId)
      .eq("family_id", authorization.familyId)
      .eq("is_active", true)
      .maybeSingle(),
    admin
      .from("family_settings")
      .select("timezone")
      .eq("family_id", authorization.familyId)
      .maybeSingle(),
  ]);

  if (!assignment) redirect(`/kid/${childId}/missions`);

  const chore = (Array.isArray(assignment.chores) ? assignment.chores[0] : assignment.chores) as {
    id: string;
    title: string;
    description?: string | null;
    credit_value: number;
    category: string;
    due_time?: string | null;
    requires_photo?: boolean;
    checklist_items?: string[] | null;
    times_per_period?: number;
    period_unit?: string;
    reminder_enabled?: boolean;
    reminder_follow_up_minutes?: number | null;
  } | null;

  if (!chore) redirect(`/kid/${childId}/missions`);

  const timeZone = settings?.timezone ?? "America/New_York";
  const dueOn = getLocalDateKey(new Date(), timeZone);
  const now = new Date();
  const periodUnit = chore.period_unit ?? "day";

  const periodStart =
    periodUnit === "week"
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString()
      : periodUnit === "month"
        ? new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        : new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [{ data: progress }, { data: completions }] = await Promise.all([
    admin
      .from("mission_progress")
      .select("started_at, snoozed_until, snooze_count")
      .eq("assignment_id", assignmentId)
      .eq("child_id", childId)
      .eq("due_on", dueOn)
      .maybeSingle(),
    admin
      .from("chore_completions")
      .select("status, rejection_note, reviewed_at, completed_at")
      .eq("assignment_id", assignmentId)
      .eq("child_id", childId)
      .in("status", ["pending_approval", "approved", "needs_more_work", "rejected"])
      .gte("completed_at", periodStart)
      .order("completed_at", { ascending: false }),
  ]);

  const latest = completions?.[0];
  const doneCount = (completions ?? []).filter(
    (c) => c.status === "pending_approval" || c.status === "approved",
  ).length;
  const timesAllowed = chore.times_per_period ?? 1;

  const dueAt = chore.due_time ? zonedDateTimeToUtc(dueOn, chore.due_time, timeZone) : null;
  const missedAt = dueAt
    ? new Date(
        dueAt.getTime() +
          (chore.reminder_enabled ? (chore.reminder_follow_up_minutes ?? 0) + 15 : 0) * 60_000,
      )
    : null;

  const latestStatus = (
    latest?.status ?? (progress?.started_at ? "in_progress" : null)
  ) as MissionCompletionStatus | null;

  const state = getMissionState({
    doneCount,
    timesAllowed,
    latestCompletionStatus: latestStatus,
    reviewedAt: latest?.reviewed_at,
    rejectionNote: latest?.rejection_note,
    dueTime: periodUnit === "day" ? chore.due_time : null,
    pastDue: periodUnit === "day" && missedAt ? now.getTime() > missedAt.getTime() : false,
    now,
  });

  const emoji = CATEGORY_EMOJI[chore.category as keyof typeof CATEGORY_EMOJI] ?? "⭐";
  const checklistItems = (chore.checklist_items ?? []) as string[];
  const canSnooze =
    !!chore.reminder_enabled &&
    !!dueAt &&
    Math.abs(now.getTime() - dueAt.getTime()) <= 2 * 60 * 60_000;

  return (
    <div className="-mx-4 -my-5 min-h-[calc(100vh-8rem)] bg-[#070a2c] px-4 py-5 text-white">
      <div className="mx-auto max-w-2xl space-y-5">
        {/* Back */}
        <Link
          href={`/kid/${childId}/missions`}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-cyan-100 transition-colors hover:bg-white/15"
        >
          <ArrowLeft className="size-4" />
          All Missions
        </Link>

        {/* Header card */}
        <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/40 bg-[radial-gradient(circle_at_top_left,#4c1d95_0%,#11104d_42%,#070a2c_78%)] p-6 shadow-[0_18px_50px_rgba(20,184,166,0.2)]">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-400/20 blur-3xl" />
          <div className="relative flex gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white text-5xl shadow-[0_6px_0_#dbe2ea]">
              {emoji}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    state.key === "needs_more_work"
                      ? "bg-rose-100 text-rose-700"
                      : state.key === "completed" || state.key === "waiting_for_check"
                        ? "bg-emerald-300 text-emerald-950"
                        : state.key === "missed"
                          ? "bg-slate-400 text-slate-900"
                          : "bg-cyan-300 text-cyan-950"
                  }`}
                >
                  {state.childLabel}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/15 px-3 py-1 text-xs font-black text-amber-100">
                  <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                  {chore.credit_value} Credits
                </span>
              </div>
              <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl">
                {chore.title}
              </h1>
              {chore.description && (
                <p className="mt-2 text-sm font-bold text-cyan-100/80">{chore.description}</p>
              )}
            </div>
          </div>

          <div className="relative mt-4 flex flex-wrap gap-2">
            {chore.due_time && periodUnit === "day" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black text-cyan-100">
                <Clock className="size-3.5" />
                Due {chore.due_time}
              </span>
            )}
            {timesAllowed > 1 && (
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black text-cyan-100">
                {doneCount}/{timesAllowed}× this {periodUnit}
              </span>
            )}
            {chore.requires_photo && (
              <span className="rounded-full border border-amber-300/30 bg-amber-300/15 px-3 py-1.5 text-xs font-black text-amber-100">
                📷 Photo proof
              </span>
            )}
          </div>
        </section>

        {/* Needs more work */}
        {state.key === "needs_more_work" && state.note && (
          <div className="rounded-2xl border border-rose-300/50 bg-rose-300/10 p-4">
            <p className="flex items-start gap-2 text-sm font-black text-rose-100">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-300" />
              Almost there: {state.note}
            </p>
          </div>
        )}

        {/* Completed / waiting */}
        {(state.key === "completed" || state.key === "waiting_for_check") && (
          <div className="rounded-2xl border border-emerald-300/40 bg-emerald-300/10 p-5 text-center">
            <CheckCircle2 className="mx-auto mb-2 size-10 text-emerald-300" />
            <p className="text-lg font-black text-white">
              {state.key === "completed" ? "Mission Complete! 🎉" : "Waiting for Mission Check"}
            </p>
            <p className="mt-1 text-sm font-bold text-emerald-100">
              {state.key === "completed"
                ? `You earned ${chore.credit_value} Credits.`
                : "Your parent will review this soon."}
            </p>
          </div>
        )}

        {/* Missed */}
        {state.key === "missed" && (
          <div className="rounded-2xl border border-slate-300/30 bg-slate-300/10 p-5 text-center">
            <p className="text-lg font-black text-white">⏰ Missed today</p>
            <p className="mt-1 text-sm font-bold text-slate-300">Try again tomorrow.</p>
          </div>
        )}

        {/* Checklist */}
        {checklistItems.length > 0 && (
          <section className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
            <h2 className="mb-4 text-base font-black text-white">Steps to complete</h2>
            <ol className="space-y-3">
              {checklistItems.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/30 text-xs font-black text-violet-100">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-sm font-bold text-cyan-100">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Action controls */}
        {state.canSubmit && (
          <section className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
            <MissionStartControls
              assignmentId={assignmentId}
              childId={childId}
              started={!!progress?.started_at}
              snoozeUsed={!!progress?.snooze_count && progress.snooze_count >= 1}
              snoozedUntil={progress?.snoozed_until ?? null}
              canSnooze={canSnooze}
              requiresPhoto={!!chore.requires_photo}
              checklistItems={checklistItems}
            />
          </section>
        )}
      </div>
    </div>
  );
}
