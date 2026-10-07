export const dynamic = "force-dynamic";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeChildAccess } from "@/lib/kid-authorization";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/shared/EmptyState";
import { MarkDoneButton } from "@/components/kid/MarkDoneButton";
import { RealtimeKidRefresh } from "@/components/kid/RealtimeKidRefresh";
import { CATEGORY_EMOJI } from "@/lib/constants";
import { getMissionState, type MissionCompletionStatus } from "@/lib/mission-product";
import { Star } from "lucide-react";

interface PageProps {
  params: Promise<{ childId: string }>;
}

export default async function KidMissionsPage({ params }: PageProps) {
  const { childId } = await params;
  if (!(await authorizeChildAccess(childId))) redirect("/kids");

  const supabase = createAdminClient();

  const { data: child } = await supabase
    .from("child_profiles")
    .select("family_id")
    .eq("id", childId)
    .single();

  if (!child) redirect("/kid/select");

  const { data: assignments } = await supabase
    .from("chore_assignments")
    .select(
      `id, chores(id, title, description, credit_value, category, due_time, requires_photo, checklist_items, times_per_period, period_unit)`,
    )
    .eq("child_id", childId)
    .eq("is_active", true);

  const now = new Date();
  const dayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).toISOString();
  const weekStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - now.getDay(),
  ).toISOString();
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();

  const { data: periodCompletions } = await supabase
    .from("chore_completions")
    .select("assignment_id, completed_at, status, reviewed_at, rejection_note")
    .eq("child_id", childId)
    .in("status", ["pending_approval", "approved", "needs_more_work", "rejected"])
    .gte("completed_at", monthStart);

  function countForAssignment(
    assignmentId: string,
    periodUnit: string,
  ): number {
    const cutoff =
      periodUnit === "week"
        ? weekStart
        : periodUnit === "month"
          ? monthStart
          : dayStart;
    return (periodCompletions ?? []).filter(
      (c) =>
        c.assignment_id === assignmentId &&
        c.completed_at >= cutoff &&
        (c.status === "pending_approval" || c.status === "approved"),
    ).length;
  }

  function latestCompletionForAssignment(assignmentId: string) {
    return (periodCompletions ?? [])
      .filter((c) => c.assignment_id === assignmentId)
      .sort(
        (a, b) =>
          new Date(b.completed_at).getTime() -
          new Date(a.completed_at).getTime(),
      )[0];
  }

  type ChoreShape = {
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
  };

  const items = (assignments ?? [])
    .map((a) => {
      const chore = (
        Array.isArray(a.chores) ? a.chores[0] : a.chores
      ) as ChoreShape | null;
      if (!chore) return null;
      const timesAllowed = chore.times_per_period ?? 1;
      const periodUnit = chore.period_unit ?? "day";
      const doneCount = countForAssignment(a.id, periodUnit);
      const latest = latestCompletionForAssignment(a.id);
      const state = getMissionState({
        doneCount,
        timesAllowed,
        latestCompletionStatus: latest?.status as MissionCompletionStatus | null,
        reviewedAt: latest?.reviewed_at,
        rejectionNote: latest?.rejection_note,
        dueTime: periodUnit === "day" ? chore.due_time : null,
        now,
      });
      return {
        assignmentId: a.id,
        chore,
        timesAllowed,
        periodUnit,
        doneCount,
        state,
      };
    })
    .filter(Boolean) as {
    assignmentId: string;
    chore: ChoreShape;
    timesAllowed: number;
    periodUnit: string;
    doneCount: number;
    state: ReturnType<typeof getMissionState>;
  }[];

  const todo = items.filter((i) => i.state.canSubmit);
  const waiting = items.filter((i) => i.state.key === "waiting_for_check");
  const missed = items.filter((i) => i.state.key === "missed");
  const done = items.filter((i) => i.state.key === "completed");

  const PERIOD_LABEL: Record<string, string> = {
    day: "day",
    week: "week",
    month: "month",
  };

  if (!items.length) {
    return (
      <EmptyState
        icon={Star}
        title="No missions yet"
        description="You're all caught up. Check back later for your next Mission."
      />
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <RealtimeKidRefresh childId={childId} />
      <div>
        <h1 className="text-2xl font-black text-slate-800">My Missions 🗂️</h1>
        <p className="text-sm font-bold text-slate-500 mt-1">
          {todo.length} to do · {waiting.length} waiting · {done.length} done
        </p>
      </div>

      {todo.length > 0 && (
        <div className="space-y-3">
          {todo.map(
            ({ assignmentId, chore, timesAllowed, periodUnit, doneCount, state }) => (
              <div
                key={assignmentId}
                className={`rounded-3xl border-4 bg-white p-4 flex items-start gap-3 ${state.key === "needs_more_work" ? "border-red-300 shadow-[0_4px_0_#fca5a5]" : "border-violet-200 shadow-[0_4px_0_#ddd6fe]"}`}
              >
                <div className="text-3xl shrink-0">
                  {CATEGORY_EMOJI[
                    chore.category as keyof typeof CATEGORY_EMOJI
                  ] ?? "📋"}
                </div>
                <div className="flex-1 min-w-0">
                  {state.key === "needs_more_work" && (
                    <div className="mb-2 flex items-start gap-1.5 bg-red-50 border-2 border-red-200 rounded-xl px-2.5 py-1.5">
                      <p className="text-xs font-black text-red-700">
                        Almost there · {state.note}
                      </p>
                    </div>
                  )}
                  <span className="mb-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-600">
                    {state.childLabel}
                  </span>
                  <p className="font-black text-slate-800">{chore.title}</p>
                  {chore.description && (
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      {chore.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 border-2 border-amber-200 text-xs font-black px-2 py-0.5 rounded-full">
                      <Star className="w-3 h-3" />
                      {chore.credit_value} Credits
                    </span>
                    {timesAllowed > 1 && (
                      <span className="text-xs font-black bg-violet-100 text-violet-700 border-2 border-violet-200 px-2 py-0.5 rounded-full">
                        {doneCount}/{timesAllowed}× this{" "}
                        {PERIOD_LABEL[periodUnit] ?? periodUnit}
                      </span>
                    )}
                    {chore.due_time && (
                      <span className="text-xs font-bold text-slate-400">
                        Due {chore.due_time}
                      </span>
                    )}
                  </div>
                </div>
                <MarkDoneButton
                  assignmentId={assignmentId}
                  childId={childId}
                  requiresPhoto={chore.requires_photo ?? false}
                  checklistItems={chore.checklist_items ?? []}
                />
              </div>
            ),
          )}
        </div>
      )}

      {(waiting.length > 0 || missed.length > 0) && (
        <div className="space-y-2">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Mission states
          </h2>
          {[...waiting, ...missed].map(({ assignmentId, chore, state }) => (
            <div
              key={assignmentId}
              className={`rounded-2xl border-2 p-3 flex items-center gap-3 ${state.key === "missed" ? "border-slate-200 bg-slate-50" : "border-amber-200 bg-amber-50"}`}
            >
              <span className="text-xl shrink-0">
                {CATEGORY_EMOJI[
                  chore.category as keyof typeof CATEGORY_EMOJI
                ] ?? "📋"}
              </span>
              <p className="text-sm font-bold flex-1 truncate text-slate-600">
                {chore.title}
              </p>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-white text-slate-600 shrink-0">
                {state.childLabel}
              </span>
            </div>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Completed ✅
          </h2>
          {done.map(({ assignmentId, chore, timesAllowed, periodUnit }) => (
            <div
              key={assignmentId}
              className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-3 flex items-center gap-3 opacity-70"
            >
              <span className="text-xl shrink-0">
                {CATEGORY_EMOJI[
                  chore.category as keyof typeof CATEGORY_EMOJI
                ] ?? "📋"}
              </span>
              <p className="text-sm font-bold flex-1 truncate line-through text-slate-500">
                {chore.title}
              </p>
              <span className="text-xs font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full shrink-0">
                {timesAllowed > 1
                  ? `${timesAllowed}× this ${PERIOD_LABEL[periodUnit] ?? periodUnit} ✓`
                  : `+${chore.credit_value} ⭐`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
