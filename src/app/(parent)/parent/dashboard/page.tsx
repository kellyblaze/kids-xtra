export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type React from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Gift,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import { AVATAR_EMOJI } from "@/lib/constants";
import { ensureFamilyCode } from "@/app/actions/auth";
import { WeeklyScheduleGrid } from "@/components/parent/WeeklyScheduleGrid";
import { buildWeekSchedule, buildPeriodicChores } from "@/lib/schedule";

export default async function ParentDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id, families(family_code, settings)")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const familyId = profile.family_id;
  const familyRow = Array.isArray(profile.families)
    ? profile.families[0]
    : profile.families;
  const typedFamily = familyRow as {
    family_code?: string;
    settings?: Record<string, unknown>;
  } | null;
  let familyCode = typedFamily?.family_code ?? null;
  const onboarding = (typedFamily?.settings?.onboarding ?? {}) as {
    completed?: boolean;
    step?: number;
  };
  // New accounts that haven't finished setup are sent to the wizard.
  // Once completed, the wizard sets onboarding.completed = true.
  if (!onboarding.completed) {
    redirect("/parent/onboarding")
  }

  if (!familyCode) {
    const result = await ensureFamilyCode();
    familyCode = result.code;
  }

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const [
    { data: children },
    { data: pendingCompletions },
    { data: pendingRedemptions },
    { data: recentActivity },
    { data: chores },
    { data: goals },
    { data: weekTransactions },
  ] = await Promise.all([
    supabase
      .from("child_profiles")
      .select("id, name, avatar_key, color_theme, credit_balance, level")
      .eq("family_id", familyId)
      .eq("is_active", true)
      .order("created_at"),
    supabase
      .from("chore_completions")
      .select("id, child_id, completed_at")
      .eq("family_id", familyId)
      .eq("status", "pending_approval")
      .limit(10),
    supabase
      .from("reward_redemptions")
      .select("id, child_id, requested_at")
      .eq("family_id", familyId)
      .eq("status", "requested")
      .limit(10),
    supabase
      .from("activity_logs")
      .select("id, event_type, metadata, created_at, child_profiles(name)")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("chores")
      .select(
        "id, title, credit_value, category, period_unit, times_per_period, chore_assignments(child_profiles(name))",
      )
      .eq("family_id", familyId)
      .eq("is_active", true)
      .order("created_at"),
    supabase
      .from("child_goals")
      .select("child_id, child_profiles(name, credit_balance), rewards(title, credit_cost)")
      .eq("family_id", familyId),
    supabase
      .from("credit_transactions")
      .select("amount")
      .eq("family_id", familyId)
      .gte("created_at", weekStart.toISOString()),
  ]);

  const missionChecksCount = pendingCompletions?.length ?? 0;
  const rewardRequestsCount = pendingRedemptions?.length ?? 0;
  const pendingCount = missionChecksCount + rewardRequestsCount;

  const weekDays = buildWeekSchedule(chores ?? [], weekStart);
  const periodicChores = buildPeriodicChores(chores ?? []);
  const earnedThisWeek = (weekTransactions ?? [])
    .filter((tx) => (tx.amount ?? 0) > 0)
    .reduce((sum, tx) => sum + (tx.amount ?? 0), 0);
  const spentThisWeek = Math.abs(
    (weekTransactions ?? [])
      .filter((tx) => (tx.amount ?? 0) < 0)
      .reduce((sum, tx) => sum + (tx.amount ?? 0), 0),
  );
  const totalSaved = (children ?? []).reduce(
    (sum, child) => sum + (child.credit_balance ?? 0),
    0,
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8 text-slate-950">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-6 p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-emerald-700">
                  Parent Command Center
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                  Good morning, here is what needs your attention.
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-600">
                  Review completed Missions, keep reward requests moving, and
                  see how your family is building better habits this week.
                </p>
              </div>
              <Link
                href="/parent/approvals"
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 active:translate-y-0"
              >
                Review queue
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={CheckCircle2}
                label="Missions this week"
                value={earnedThisWeek > 0 ? `+${earnedThisWeek}` : "0"}
                detail="Credits earned"
                tone="emerald"
              />
              <MetricCard
                icon={Clock3}
                label="Needs review"
                value={pendingCount}
                detail={`${missionChecksCount} Missions, ${rewardRequestsCount} rewards`}
                tone="amber"
              />
              <MetricCard
                icon={WalletCards}
                label="Family Credits"
                value={totalSaved}
                detail={`-${spentThisWeek} spent this week`}
                tone="blue"
              />
              <MetricCard
                icon={PiggyBank}
                label="Savings goals"
                value={goals?.length ?? 0}
                detail="Active goals"
                tone="rose"
              />
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-950 p-6 text-white lg:border-l lg:border-t-0 md:p-8">
            <div className="flex h-full flex-col justify-between gap-8">
              <div>
                <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
                  <ShieldCheck className="size-6" />
                </div>
                <h2 className="mt-5 text-2xl font-black">Family code</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-300">
                  Children use this code at Kid Login to reach their account.
                </p>
              </div>
              {familyCode && (
                <div className="rounded-3xl border border-white/15 bg-white/10 p-5">
                  <p className="text-xs font-black text-emerald-200">
                    KID LOGIN CODE
                  </p>
                  <p className="mt-2 text-4xl font-black tracking-[0.18em] text-white">
                    {familyCode}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {!onboarding.completed && (
        <Link
          href="/parent/onboarding"
          className="flex flex-col justify-between gap-4 rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-violet-700 shadow-sm">
              <Sparkles className="size-6" />
            </div>
            <div>
              <p className="font-black text-violet-950">
                Finish setting up your family
              </p>
              <p className="text-sm font-medium text-violet-700">
                Resume at step {(onboarding.step ?? 0) + 1} of 8.
              </p>
            </div>
          </div>
          <ArrowRight className="size-5 shrink-0 text-violet-700" />
        </Link>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
        <section className="space-y-6">
          <Panel
            title="Priority Queue"
            action={
              <Link
                href="/parent/approvals"
                className="text-sm font-black text-emerald-700 hover:text-emerald-800"
              >
                Open review
              </Link>
            }
          >
            {pendingCount > 0 ? (
              <div className="space-y-3">
                <PriorityRow
                  icon={CheckCircle2}
                  label="Mission Checks"
                  value={missionChecksCount}
                  detail="Proof waiting for parent review"
                />
                <PriorityRow
                  icon={Gift}
                  label="Reward requests"
                  value={rewardRequestsCount}
                  detail="Rewards waiting for approval"
                />
              </div>
            ) : (
              <EmptyBlock
                icon={CheckCircle2}
                title="All caught up"
                body="No Mission Checks or reward requests are waiting right now."
              />
            )}
          </Panel>

          <Panel
            title="Your Children"
            action={
              <Link
                href="/parent/children"
                className="text-sm font-black text-emerald-700 hover:text-emerald-800"
              >
                Manage
              </Link>
            }
          >
            {!children?.length ? (
              <EmptyBlock
                icon={Users}
                title="No children yet"
                body="Add your first child to start assigning Missions."
              />
            ) : (
              <div className="space-y-3">
                {children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/parent/children/${child.id}`}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100"
                  >
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                      {AVATAR_EMOJI[child.avatar_key ?? "star"] ?? "Star"}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">
                        {child.name}
                      </p>
                      <p className="text-xs font-bold text-slate-500">
                        Level {child.level}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-950">
                        {child.credit_balance}
                      </p>
                      <p className="text-xs font-bold text-slate-500">
                        Credits
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Quick Actions">
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <QuickAction href="/parent/chores/new" label="Add a Mission" />
              <QuickAction href="/parent/rewards/new" label="Add a reward" />
              <QuickAction href="/parent/children" label="Add a child" />
            </div>
          </Panel>
        </section>

        <section className="space-y-6">
          <Panel
            title="Savings Goals"
            action={<Target className="size-5 text-rose-500" />}
          >
            {!goals?.length ? (
              <EmptyBlock
                icon={PiggyBank}
                title="No active goals yet"
                body="Set a reward as a goal to help children see progress."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {goals.map((goal) => {
                  const child = Array.isArray(goal.child_profiles)
                    ? goal.child_profiles[0] ?? null
                    : goal.child_profiles;
                  const reward = Array.isArray(goal.rewards)
                    ? goal.rewards[0] ?? null
                    : goal.rewards;
                  const balance = child?.credit_balance ?? 0;
                  const cost = reward?.credit_cost ?? 0;
                  const progress =
                    cost > 0 ? Math.min(100, Math.round((balance / cost) * 100)) : 0;
                  return (
                    <div
                      key={goal.child_id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-950">
                            {child?.name ?? "Child"}
                          </p>
                          <p className="mt-1 truncate text-xs font-bold text-slate-500">
                            {reward?.title ?? "Reward goal"}
                          </p>
                        </div>
                        <p className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-rose-700 shadow-sm">
                          {progress}%
                        </p>
                      </div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-rose-100">
                        <div
                          className="h-full rounded-full bg-rose-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs font-bold text-slate-500">
                        {balance} of {cost} Credits
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel
            title="Credit Activity"
            action={
              <Link
                href="/parent/activity"
                className="text-sm font-black text-emerald-700 hover:text-emerald-800"
              >
                View ledger
              </Link>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <ActivityStat
                icon={TrendingUp}
                label="Earned this week"
                value={`+${earnedThisWeek}`}
                tone="emerald"
              />
              <ActivityStat
                icon={BadgeDollarSign}
                label="Spent this week"
                value={`-${spentThisWeek}`}
                tone="slate"
              />
            </div>
          </Panel>

          <Panel
            title="Recent Activity"
            action={
              <Link
                href="/parent/activity"
                className="text-sm font-black text-emerald-700 hover:text-emerald-800"
              >
                All activity
              </Link>
            }
          >
            {!recentActivity?.length ? (
              <EmptyBlock
                icon={CalendarDays}
                title="No activity yet"
                body="Completed Missions and reward requests will appear here."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {recentActivity.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <ActivityIcon eventType={log.event_type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold leading-5 text-slate-800">
                        {(() => {
                          const child = Array.isArray(log.child_profiles)
                            ? (log.child_profiles[0] ?? null)
                            : log.child_profiles;
                          return child?.name ?? "Parent";
                        })()}{" "}
                        <span className="font-medium text-slate-500">
                          {activityLabel(
                            log.event_type,
                            log.metadata as Record<string, string>,
                          )}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-slate-400">
                        {formatRelativeTime(log.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </section>
      </div>

      <WeeklyScheduleGrid days={weekDays} periodicChores={periodicChores} />
    </div>
  );
}

type Tone = "emerald" | "amber" | "blue" | "rose" | "slate";
type IconType = React.ComponentType<{ className?: string }>;

const toneStyles: Record<Tone, { card: string; icon: string; text: string }> = {
  emerald: {
    card: "border-emerald-100 bg-emerald-50",
    icon: "bg-emerald-600 text-white",
    text: "text-emerald-700",
  },
  amber: {
    card: "border-amber-100 bg-amber-50",
    icon: "bg-amber-500 text-white",
    text: "text-amber-700",
  },
  blue: {
    card: "border-sky-100 bg-sky-50",
    icon: "bg-sky-600 text-white",
    text: "text-sky-700",
  },
  rose: {
    card: "border-rose-100 bg-rose-50",
    icon: "bg-rose-500 text-white",
    text: "text-rose-700",
  },
  slate: {
    card: "border-slate-200 bg-slate-50",
    icon: "bg-slate-900 text-white",
    text: "text-slate-700",
  },
};

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: IconType;
  label: string;
  value: string | number;
  detail: string;
  tone: Tone;
}) {
  const styles = toneStyles[tone];
  return (
    <div className={`rounded-3xl border p-4 ${styles.card}`}>
      <div className={`flex size-10 items-center justify-center rounded-2xl ${styles.icon}`}>
        <Icon className="size-5" />
      </div>
      <p className="mt-4 text-3xl font-black tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-sm font-black text-slate-700">{label}</p>
      <p className={`mt-1 text-xs font-bold ${styles.text}`}>{detail}</p>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-slate-950">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function PriorityRow({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: IconType;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-sm font-black text-slate-950">{label}</p>
        <p className="text-xs font-bold text-slate-500">{detail}</p>
      </div>
      <p className="text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function EmptyBlock({
  icon: Icon,
  title,
  body,
}: {
  icon: IconType;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
        <Icon className="size-5" />
      </div>
      <p className="mt-3 text-sm font-black text-slate-950">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm font-medium leading-6 text-slate-500">
        {body}
      </p>
    </div>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-800 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100"
    >
      {label}
      <ArrowRight className="size-4 text-emerald-700" />
    </Link>
  );
}

function ActivityStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: IconType;
  label: string;
  value: string;
  tone: Tone;
}) {
  const styles = toneStyles[tone];
  return (
    <div className={`rounded-2xl border p-4 ${styles.card}`}>
      <div className={`flex size-10 items-center justify-center rounded-2xl ${styles.icon}`}>
        <Icon className="size-5" />
      </div>
      <p className="mt-4 text-2xl font-black text-slate-950">{value}</p>
      <p className="text-sm font-bold text-slate-600">{label}</p>
    </div>
  );
}

function ActivityIcon({ eventType }: { eventType: string }) {
  if (eventType.includes("reward")) return <Gift className="size-4" />;
  if (eventType.includes("approved")) return <ShieldCheck className="size-4" />;
  if (eventType.includes("created")) return <Sparkles className="size-4" />;
  return <CheckCircle2 className="size-4" />;
}

function activityLabel(
  eventType: string,
  metadata: Record<string, string> | null,
): string {
  const m = metadata ?? {};
  const map: Record<string, string> = {
    chore_completed: `completed "${m.mission_title ?? m.chore_title ?? "a Mission"}"`,
    mission_completed: `completed "${m.mission_title ?? "a Mission"}"`,
    chore_approved: `earned ${m.credits ?? ""} Credits`,
    chore_rejected: "got feedback on a Mission",
    mission_needs_work: "got feedback on a Mission",
    reward_requested: `requested "${m.reward_title ?? "a reward"}"`,
    reward_approved: `redeemed "${m.reward_title ?? "a reward"}"`,
    child_created: "profile was created",
    chore_created: `new Mission "${m.chore_title ?? ""}" added`,
  };
  return map[eventType] ?? eventType.replace(/_/g, " ");
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
