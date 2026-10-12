export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import { MarkDoneButton } from "@/components/kid/MarkDoneButton";
import { RealtimeKidRefresh } from "@/components/kid/RealtimeKidRefresh";
import { authorizeChildAccess } from "@/lib/kid-authorization";
import {
  getMissionState,
  type MissionCompletionStatus,
} from "@/lib/mission-product";
import { createAdminClient } from "@/lib/supabase/admin";
import { CATEGORY_EMOJI } from "@/lib/constants";

interface PageProps {
  params: Promise<{ childId: string }>;
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

type MissionItem = {
  assignmentId: string;
  chore: ChoreShape;
  timesAllowed: number;
  periodUnit: string;
  doneCount: number;
  state: ReturnType<typeof getMissionState>;
};

const PERIOD_LABEL: Record<string, string> = {
  day: "day",
  week: "week",
  month: "month",
};

function getChoreEmoji(category: string) {
  return CATEGORY_EMOJI[category as keyof typeof CATEGORY_EMOJI] ?? "⭐";
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
      "id, chores(id, title, description, credit_value, category, due_time, requires_photo, checklist_items, times_per_period, period_unit)",
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
    .in("status", [
      "pending_approval",
      "approved",
      "needs_more_work",
      "rejected",
    ])
    .gte("completed_at", monthStart);

  function countForAssignment(assignmentId: string, periodUnit: string): number {
    const cutoff =
      periodUnit === "week"
        ? weekStart
        : periodUnit === "month"
          ? monthStart
          : dayStart;
    return (periodCompletions ?? []).filter(
      (completion) =>
        completion.assignment_id === assignmentId &&
        completion.completed_at >= cutoff &&
        (completion.status === "pending_approval" ||
          completion.status === "approved"),
    ).length;
  }

  function latestCompletionForAssignment(assignmentId: string) {
    return (periodCompletions ?? [])
      .filter((completion) => completion.assignment_id === assignmentId)
      .sort(
        (a, b) =>
          new Date(b.completed_at).getTime() -
          new Date(a.completed_at).getTime(),
      )[0];
  }

  const items = (assignments ?? [])
    .map((assignment) => {
      const chore = (
        Array.isArray(assignment.chores)
          ? assignment.chores[0]
          : assignment.chores
      ) as ChoreShape | null;
      if (!chore) return null;
      const timesAllowed = chore.times_per_period ?? 1;
      const periodUnit = chore.period_unit ?? "day";
      const doneCount = countForAssignment(assignment.id, periodUnit);
      const latest = latestCompletionForAssignment(assignment.id);
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
        assignmentId: assignment.id,
        chore,
        timesAllowed,
        periodUnit,
        doneCount,
        state,
      };
    })
    .filter(Boolean) as MissionItem[];

  const todo = items.filter((item) => item.state.canSubmit);
  const needsWork = todo.filter((item) => item.state.key === "needs_more_work");
  const ready = todo.filter((item) => item.state.key !== "needs_more_work");
  const waiting = items.filter((item) => item.state.key === "waiting_for_check");
  const missed = items.filter((item) => item.state.key === "missed");
  const done = items.filter((item) => item.state.key === "completed");
  const creditsAvailable = todo.reduce(
    (sum, item) => sum + (item.chore.credit_value ?? 0),
    0,
  );

  if (!items.length) {
    return (
      <div className="-mx-4 -my-5 min-h-[calc(100vh-8rem)] bg-[#070a2c] px-4 py-8 text-white">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-cyan-300/40 bg-[radial-gradient(circle_at_top_left,#5b21b6_0%,#10105a_42%,#070a2c_100%)] p-6 text-center shadow-[0_18px_50px_rgba(20,184,166,0.2)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 text-5xl">
            ⭐
          </div>
          <h1 className="mt-4 text-3xl font-black">No missions yet</h1>
          <p className="mt-2 text-sm font-bold text-cyan-100">
            You are all caught up. Check back later for your next mission.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-4 -my-5 min-h-[calc(100vh-8rem)] bg-[#070a2c] px-4 py-5 text-white">
      <RealtimeKidRefresh childId={childId} />
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/40 bg-[radial-gradient(circle_at_top_left,#4c1d95_0%,#11104d_42%,#070a2c_78%)] p-5 shadow-[0_18px_50px_rgba(20,184,166,0.2)]">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              Mission Control
            </div>
            <h1 className="text-3xl font-black leading-tight sm:text-5xl">
              Pick your next mission.
            </h1>
            <p className="mt-2 max-w-xl text-sm font-bold text-cyan-100 sm:text-base">
              Finish the steps, send your proof, and earn Xtra Credits.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <MissionStat
                icon={<Zap className="h-5 w-5 fill-amber-300 text-amber-300" />}
                label="Ready"
                value={ready.length + needsWork.length}
              />
              <MissionStat
                icon={<Clock className="h-5 w-5 text-cyan-200" />}
                label="Waiting"
                value={waiting.length}
              />
              <MissionStat
                icon={<Trophy className="h-5 w-5 text-emerald-200" />}
                label="Credits"
                value={`+${creditsAvailable}`}
              />
            </div>
          </div>
        </section>

        {todo.length > 0 && (
          <section className="space-y-3">
            <SectionHeader
              icon={<Flame className="h-5 w-5 fill-amber-300 text-amber-300" />}
              title="Ready to Start"
              count={`${todo.length} mission${todo.length === 1 ? "" : "s"}`}
            />
            <div className="grid gap-4 lg:grid-cols-2">
              {todo.map((item) => (
                <MissionCard
                  key={item.assignmentId}
                  item={item}
                  childId={childId}
                />
              ))}
            </div>
          </section>
        )}

        {(waiting.length > 0 || missed.length > 0) && (
          <section className="space-y-3">
            <SectionHeader
              icon={<Clock className="h-5 w-5 text-cyan-200" />}
              title="Mission States"
              count={`${waiting.length + missed.length} update${
                waiting.length + missed.length === 1 ? "" : "s"
              }`}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {[...waiting, ...missed].map((item) => (
                <StateCard key={item.assignmentId} item={item} />
              ))}
            </div>
          </section>
        )}

        {done.length > 0 && (
          <section className="space-y-3">
            <SectionHeader
              icon={<CheckCircle2 className="h-5 w-5 text-emerald-200" />}
              title="Completed"
              count={`${done.length} done`}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {done.map((item) => (
                <div
                  key={item.assignmentId}
                  className="flex items-center gap-3 rounded-3xl border border-emerald-300/30 bg-emerald-300/10 p-3"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl">
                    {getChoreEmoji(item.chore.category)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-white">
                      {item.chore.title}
                    </p>
                    <p className="text-xs font-bold text-emerald-100">
                      {item.timesAllowed > 1
                        ? `${item.timesAllowed}x this ${
                            PERIOD_LABEL[item.periodUnit] ?? item.periodUnit
                          }`
                        : `+${item.chore.credit_value} Credits`}
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-200" />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function MissionStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className="text-xs font-black uppercase tracking-wide text-cyan-100">
          {label}
        </span>
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  count: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-xl font-black text-white">
        {icon}
        {title}
      </h2>
      <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-cyan-100">
        {count}
      </span>
    </div>
  );
}

function MissionCard({ item, childId }: { item: MissionItem; childId: string }) {
  const isNeedsWork = item.state.key === "needs_more_work";

  return (
    <article
      className={`rounded-[1.75rem] border p-4 shadow-[0_8px_0_rgba(15,23,42,0.3)] ${
        isNeedsWork
          ? "border-rose-300/60 bg-[radial-gradient(circle_at_top_left,#881337_0%,#181044_62%,#080a2c_100%)]"
          : "border-cyan-300/40 bg-slate-950/75"
      }`}
    >
      <div className="flex gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white text-4xl shadow-[0_5px_0_#dbe2ea]">
          {getChoreEmoji(item.chore.category)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${
                isNeedsWork
                  ? "bg-rose-100 text-rose-700"
                  : "bg-emerald-300 text-emerald-950"
              }`}
            >
              {item.state.childLabel}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/15 px-3 py-1 text-xs font-black text-amber-100">
              <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
              {item.chore.credit_value} Credits
            </span>
          </div>
          <h3 className="text-lg font-black leading-tight text-white">
            {item.chore.title}
          </h3>
          {item.chore.description && (
            <p className="mt-1 line-clamp-2 text-sm font-bold text-cyan-100/80">
              {item.chore.description}
            </p>
          )}
        </div>
      </div>

      {isNeedsWork && item.state.note && (
        <div className="mt-4 rounded-2xl border border-rose-200/40 bg-rose-100/15 p-3">
          <p className="flex items-start gap-2 text-xs font-black text-rose-50">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Almost there: {item.state.note}
          </p>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
          <div className="flex flex-wrap gap-2">
            {item.timesAllowed > 1 && (
              <span className="rounded-full bg-violet-300/20 px-3 py-1 text-xs font-black text-violet-100">
                {item.doneCount}/{item.timesAllowed} this{" "}
                {PERIOD_LABEL[item.periodUnit] ?? item.periodUnit}
              </span>
            )}
            {item.chore.due_time && (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-cyan-100">
                Due {item.chore.due_time}
              </span>
            )}
            {item.chore.requires_photo && (
              <span className="rounded-full bg-amber-300/15 px-3 py-1 text-xs font-black text-amber-100">
                Photo proof
              </span>
            )}
            {(item.chore.checklist_items?.length ?? 0) > 0 && (
              <span className="rounded-full bg-emerald-300/15 px-3 py-1 text-xs font-black text-emerald-100">
                Checklist
              </span>
            )}
          </div>
        </div>

        <MarkDoneButton
          assignmentId={item.assignmentId}
          childId={childId}
          requiresPhoto={item.chore.requires_photo ?? false}
          checklistItems={item.chore.checklist_items ?? []}
        />
      </div>
    </article>
  );
}

function StateCard({ item }: { item: MissionItem }) {
  const missed = item.state.key === "missed";
  return (
    <div
      className={`flex items-center gap-3 rounded-3xl border p-3 ${
        missed
          ? "border-slate-300/30 bg-slate-200/10"
          : "border-amber-300/50 bg-amber-300/15"
      }`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl">
        {missed ? "⏰" : getChoreEmoji(item.chore.category)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-white">
          {item.chore.title}
        </p>
        <p className="text-xs font-bold text-cyan-100">
          {missed ? "Try again next time" : "Parent check is next"}
        </p>
      </div>
      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white">
        {item.state.childLabel}
      </span>
    </div>
  );
}
