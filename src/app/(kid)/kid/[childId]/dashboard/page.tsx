export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  Gamepad2,
  Gift,
  PiggyBank,
  ShoppingCart,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import { BadgeGrid } from "@/components/kid/BadgeGrid";
import { CelebrationList } from "@/components/kid/CelebrationList";
import { SiblingLeaderboard } from "@/components/kid/SiblingLeaderboard";
import { authorizeChildAccess } from "@/lib/kid-authorization";
import { getWeeklyLeaderboard } from "@/lib/leaderboard";
import { getCelebrations } from "@/lib/mission-product";
import { createAdminClient } from "@/lib/supabase/admin";
import { CATEGORY_EMOJI } from "@/lib/constants";
import type { TaskCategory } from "@/types/database";

interface PageProps {
  params: Promise<{ childId: string }>;
}

type Relation<T> = T | T[] | null | undefined;

type MissionAssignment = {
  id: string;
  chores:
    | {
        title: string;
        credit_value: number;
        category: string;
      }
    | {
        title: string;
        credit_value: number;
        category: string;
      }[]
    | null;
};

function firstRelation<T>(value: Relation<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function getCategoryEmoji(category: string | null | undefined) {
  if (!category) return "⭐";
  return CATEGORY_EMOJI[category as TaskCategory] ?? "⭐";
}

export default async function KidDashboardPage({ params }: PageProps) {
  const { childId } = await params;

  if (!(await authorizeChildAccess(childId))) redirect("/kids");

  const admin = createAdminClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const [
    { data: child },
    { data: completions },
    { data: redemptions },
    { data: streak },
    { data: goalRow },
    { data: earnedBadges },
    { data: weekTransactions },
    { data: missionAssignments },
    { data: todayCompletions },
  ] = await Promise.all([
    admin
      .from("child_profiles")
      .select("id, name, credit_balance, level, xp_total, family_id")
      .eq("id", childId)
      .single(),

    admin
      .from("chore_completions")
      .select(
        "id, status, completed_at, reviewed_at, credits_awarded, xp_awarded, chore_assignments(chores(title, credit_value))",
      )
      .eq("child_id", childId)
      .in("status", ["pending_approval", "approved", "needs_more_work"])
      .order("completed_at", { ascending: false })
      .limit(5),

    admin
      .from("reward_redemptions")
      .select("id, status, requested_at, rewards(title)")
      .eq("child_id", childId)
      .in("status", ["requested", "approved", "fulfilled"])
      .order("requested_at", { ascending: false })
      .limit(3),

    admin
      .from("child_streaks")
      .select("current_streak, longest_streak")
      .eq("child_id", childId)
      .maybeSingle(),

    admin
      .from("child_goals")
      .select("reward_id, rewards(title, credit_cost)")
      .eq("child_id", childId)
      .maybeSingle(),

    admin
      .from("child_badges")
      .select("badge_key, earned_at")
      .eq("child_id", childId)
      .order("earned_at"),

    admin
      .from("credit_transactions")
      .select("amount")
      .eq("child_id", childId)
      .gte("created_at", weekStart.toISOString()),

    admin
      .from("chore_assignments")
      .select("id, chores(title, credit_value, category)")
      .eq("child_id", childId)
      .eq("is_active", true)
      .limit(4),

    admin
      .from("chore_completions")
      .select("id, status")
      .eq("child_id", childId)
      .gte("completed_at", todayStart.toISOString())
      .in("status", ["pending_approval", "approved"]),
  ]);

  if (!child) redirect("/kid/select");

  const leaderboard = await getWeeklyLeaderboard(
    admin,
    child.family_id as string,
    weekStart.toISOString(),
  );

  const pendingCount =
    completions?.filter((completion) => completion.status === "pending_approval")
      .length ?? 0;
  const readyRewardCount =
    redemptions?.filter((redemption) => redemption.status === "approved")
      .length ?? 0;
  const activeMissionCount = missionAssignments?.length ?? 0;
  const completedTodayCount = todayCompletions?.length ?? 0;

  const currentXp = child.xp_total ?? 0;
  const currentLevel = child.level ?? 1;
  const xpForCurrentLevel = Math.pow(currentLevel - 1, 2) * 50;
  const xpForNextLevel = Math.pow(currentLevel, 2) * 50;
  const xpProgress =
    xpForNextLevel > xpForCurrentLevel
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              ((currentXp - xpForCurrentLevel) /
                (xpForNextLevel - xpForCurrentLevel)) *
                100,
            ),
          ),
        )
      : 100;
  const currentStreakCount = streak?.current_streak ?? 0;
  const balance = child.credit_balance ?? 0;
  const earnedThisWeek = (weekTransactions ?? [])
    .filter((transaction) => (transaction.amount ?? 0) > 0)
    .reduce((sum, transaction) => sum + (transaction.amount ?? 0), 0);
  const spentThisWeek = Math.abs(
    (weekTransactions ?? [])
      .filter((transaction) => (transaction.amount ?? 0) < 0)
      .reduce((sum, transaction) => sum + (transaction.amount ?? 0), 0),
  );

  const goalReward = (() => {
    if (!goalRow) return null;
    const reward = firstRelation(goalRow.rewards);
    return reward as { title: string; credit_cost: number } | null;
  })();
  const goalCost = goalReward?.credit_cost ?? 0;
  const goalProgress =
    goalReward && goalCost > 0
      ? Math.min(100, Math.round((balance / goalCost) * 100))
      : 0;
  const latestApproved = (completions ?? []).find((completion) => {
    if (completion.status !== "approved" || !completion.reviewed_at) return false;
    return (
      new Date().getTime() - new Date(completion.reviewed_at).getTime() <
      2 * 60 * 60 * 1000
    );
  });
  const goalProgressBeforeWeek =
    goalReward && goalCost > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(((balance - earnedThisWeek) / goalCost) * 100),
          ),
        )
      : 0;
  const firstRewardRedeemed =
    (redemptions ?? []).length === 1 && redemptions?.[0]?.status === "fulfilled";
  const celebrations = getCelebrations({
    approvedMissionCredits: latestApproved?.credits_awarded ?? 0,
    approvedMissionXp: latestApproved?.xp_awarded ?? 0,
    goalProgressBefore: goalProgressBeforeWeek,
    goalProgressAfter: goalProgress,
    previousLevel:
      currentLevel > 1 && latestApproved ? currentLevel - 1 : currentLevel,
    currentLevel,
    streakCount: currentStreakCount,
    firstRewardRedeemed,
  });

  const missionCards = ((missionAssignments ?? []) as MissionAssignment[])
    .map((assignment) => {
      const chore = firstRelation(assignment.chores);
      if (!chore) return null;
      return {
        id: assignment.id,
        title: chore.title,
        credits: chore.credit_value ?? 0,
        emoji: getCategoryEmoji(chore.category),
      };
    })
    .filter(
      (
        mission,
      ): mission is {
        id: string;
        title: string;
        credits: number;
        emoji: string;
      } => mission !== null,
    );

  const challengeTarget = 2;
  const challengeProgress = Math.min(
    100,
    Math.round((completedTodayCount / challengeTarget) * 100),
  );
  const canClaimGoal = Boolean(goalReward && goalProgress >= 100);
  const xpToNextLevel = Math.max(0, xpForNextLevel - currentXp);

  return (
    <div className="-mx-4 -my-5 min-h-[calc(100vh-8rem)] bg-[#070a2c] px-4 py-5 text-white">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/40 bg-[radial-gradient(circle_at_top_left,#5b21b6_0%,#11104d_38%,#070a2c_75%)] p-5 shadow-[0_18px_50px_rgba(20,184,166,0.22)]">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-fuchsia-400/25 blur-3xl" />
          <div className="absolute bottom-0 right-3 hidden text-[9rem] leading-none opacity-15 sm:block">
            🕹️
          </div>
          <div className="relative grid gap-5 md:grid-cols-[1fr_320px] md:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-cyan-100">
                <Sparkles className="h-3.5 w-3.5" />
                Earn, save, spend, grow
              </div>
              <h1 className="text-3xl font-black leading-tight text-white sm:text-5xl">
                👋 Hey, {child.name}!
              </h1>
              <p className="mt-2 max-w-xl text-sm font-bold text-cyan-100 sm:text-base">
                Pick your next move and power up your day.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <HeroStat
                  icon={
                    <Star className="h-6 w-6 fill-amber-300 text-amber-300" />
                  }
                  label={`Level ${currentLevel}`}
                  value={`${xpToNextLevel} XP`}
                  detail="to next level"
                />
                <HeroStat
                  icon={
                    <Flame className="h-6 w-6 fill-orange-400 text-orange-400" />
                  }
                  label="Day streak"
                  value={currentStreakCount.toString()}
                  detail={
                    currentStreakCount > 0 ? "keep it going" : "start today"
                  }
                />
                <HeroStat
                  icon={<Trophy className="h-6 w-6 text-cyan-200" />}
                  label="This week"
                  value={`+${earnedThisWeek}`}
                  detail="credits earned"
                />
              </div>
            </div>

            <div className="rounded-[1.75rem] border-2 border-cyan-300/50 bg-slate-950/70 p-5 text-center shadow-[0_0_28px_rgba(34,211,238,0.35)]">
              <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-amber-300 text-4xl shadow-[0_0_24px_rgba(251,191,36,0.7)]">
                ⭐
              </div>
              <p className="text-6xl font-black leading-none text-white">
                {balance}
              </p>
              <p className="mt-1 text-lg font-black uppercase tracking-wide text-cyan-100">
                Xtra Credits
              </p>
              <p className="mt-3 rounded-full bg-emerald-400/15 px-3 py-2 text-sm font-black text-emerald-200">
                +{earnedThisWeek} this week
                {spentThisWeek > 0 ? ` · ${spentThisWeek} spent` : ""}
              </p>
            </div>
          </div>
        </section>

        <CelebrationList celebrations={celebrations} />

        <section className="grid grid-cols-3 gap-3">
          <DashboardAction
            href={`/kid/${childId}/missions`}
            icon={<Gamepad2 className="h-9 w-9" />}
            title="Earn"
            subtitle="Complete a mission"
            pill={`${pendingCount} waiting`}
            className="from-emerald-400 to-green-700 shadow-emerald-950/60"
          />
          <DashboardAction
            href={`/kid/${childId}/rewards`}
            icon={<PiggyBank className="h-9 w-9" />}
            title="Save"
            subtitle={goalReward ? "Your next goal" : "Pick a goal"}
            pill={
              goalReward ? `${balance} / ${goalReward.credit_cost}` : "Choose"
            }
            className="from-sky-400 to-blue-700 shadow-blue-950/60"
          />
          <DashboardAction
            href={`/kid/${childId}/rewards`}
            icon={<ShoppingCart className="h-9 w-9" />}
            title="Spend"
            subtitle="See rewards"
            pill={`${readyRewardCount} ready`}
            className="from-fuchsia-400 to-pink-700 shadow-pink-950/60"
          />
        </section>

        <section className="overflow-hidden rounded-[1.75rem] border border-cyan-300/60 bg-[#10105a] p-4 shadow-[0_0_22px_rgba(34,211,238,0.25)]">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-300 text-slate-950 shadow-[0_0_18px_rgba(251,191,36,0.6)]">
              <Zap className="h-8 w-8 fill-current" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-wide text-amber-200">
                Today&apos;s Xtra Challenge
              </p>
              <h2 className="text-lg font-black text-white">
                Complete {challengeTarget} missions today.
              </h2>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 to-cyan-300 transition-all"
                  style={{ width: `${challengeProgress}%` }}
                />
              </div>
            </div>
            <div className="hidden rounded-2xl border border-amber-300/50 bg-amber-300/15 px-4 py-3 text-center sm:block">
              <p className="text-2xl font-black text-amber-100">
                {completedTodayCount}/{challengeTarget}
              </p>
              <p className="text-xs font-black uppercase text-amber-200">
                done
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] bg-white p-4 text-slate-950 shadow-[0_8px_0_rgba(15,23,42,0.28)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-black">
              <Award className="h-5 w-5 text-violet-600" />
              Today&apos;s Missions
            </h2>
            <Link
              href={`/kid/${childId}/missions`}
              className="flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1.5 text-xs font-black text-violet-700 transition-all hover:bg-violet-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:scale-95"
            >
              {activeMissionCount} available{" "}
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {missionCards.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {missionCards.map((mission) => (
                <Link
                  key={mission.id}
                  href={`/kid/${childId}/missions`}
                  className="flex min-h-36 flex-col items-center justify-between rounded-2xl border-2 border-slate-200 bg-gradient-to-b from-white to-slate-50 p-3 text-center shadow-[0_4px_0_#dbe2ea] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_0_#dbe2ea] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 active:translate-y-1 active:shadow-[0_2px_0_#dbe2ea]"
                >
                  <span className="text-4xl">{mission.emoji}</span>
                  <span className="line-clamp-2 text-sm font-black leading-tight text-slate-900">
                    {mission.title}
                  </span>
                  <span className="text-xs font-black text-emerald-700">
                    +{mission.credits} Credits
                  </span>
                  <span className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-black text-white shadow-[0_3px_0_#047857]">
                    Do It
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50 p-5 text-center">
              <p className="text-4xl">🎉</p>
              <p className="mt-2 text-base font-black text-slate-800">
                No missions waiting right now.
              </p>
              <p className="mt-1 text-sm font-bold text-slate-500">
                Check rewards or ask your parent for a new mission.
              </p>
            </div>
          )}
        </section>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <GoalPanel
            childId={childId}
            goalTitle={goalReward?.title ?? null}
            goalCost={goalReward?.credit_cost ?? 0}
            balance={balance}
            progress={goalProgress}
            canClaim={canClaimGoal}
          />

          <section className="rounded-[1.75rem] border border-cyan-300/40 bg-slate-950/70 p-4 shadow-[0_0_18px_rgba(34,211,238,0.18)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-black text-white">
                <Trophy className="h-5 w-5 text-amber-300" />
                Progress
              </h2>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-cyan-100">
                Level {currentLevel}
              </span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-300 transition-all"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs font-black text-cyan-100">
              <span>{currentXp - xpForCurrentLevel} XP</span>
              <span>{xpForNextLevel - xpForCurrentLevel} XP</span>
            </div>
          </section>
        </div>

        {pendingCount > 0 && (
          <div className="rounded-[1.5rem] border border-amber-300/60 bg-amber-300/15 p-4 shadow-[0_0_18px_rgba(251,191,36,0.18)]">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 shrink-0 text-amber-200" />
              <p className="flex-1 text-sm font-black text-amber-50">
                {pendingCount} mission{pendingCount !== 1 ? "s" : ""} waiting
                for parent approval.
              </p>
            </div>
          </div>
        )}

        {(completions?.length ?? 0) > 0 && (
          <section className="space-y-3 rounded-[1.75rem] bg-white/95 p-4 text-slate-950">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">
                Recent wins
              </h2>
              <Link
                href={`/kid/${childId}/missions`}
                className="flex items-center gap-0.5 text-xs font-black text-violet-600"
              >
                See all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {completions!.map((completion) => {
              const assignment = firstRelation(completion.chore_assignments);
              const chore = firstRelation(assignment?.chores);
              const approved = completion.status === "approved";
              const needsWork = completion.status === "needs_more_work";
              const isNew =
                approved && completion.reviewed_at
                  ? new Date().getTime() -
                      new Date(completion.reviewed_at).getTime() <
                    2 * 60 * 60 * 1000
                  : false;
              return (
                <div
                  key={completion.id}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-3 ${
                    approved
                      ? "border-emerald-200 bg-emerald-50"
                      : needsWork
                        ? "border-red-200 bg-red-50"
                        : "border-slate-200 bg-white"
                  }`}
                >
                  <CheckCircle2
                    className={`h-5 w-5 shrink-0 ${
                      approved
                        ? "text-emerald-500"
                        : needsWork
                          ? "text-red-400"
                          : "text-slate-300"
                    }`}
                  />
                  <p className="flex-1 truncate text-sm font-bold text-slate-700">
                    {chore?.title ?? "Mission"}
                  </p>
                  {isNew && (
                    <span className="animate-pulse rounded-full bg-violet-600 px-2 py-0.5 text-xs font-black text-white">
                      New
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-black ${
                      approved
                        ? "bg-emerald-100 text-emerald-700"
                        : needsWork
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {approved
                      ? `+${chore?.credit_value ?? 0} ⭐`
                      : needsWork
                        ? "Needs Work"
                        : "Pending"}
                  </span>
                </div>
              );
            })}
          </section>
        )}

        {(redemptions?.length ?? 0) > 0 && (
          <section className="space-y-3 rounded-[1.75rem] bg-white/95 p-4 text-slate-950">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">
              Reward requests
            </h2>
            {redemptions!.map((redemption) => {
              const reward = firstRelation(redemption.rewards);
              const approved = redemption.status === "approved";
              return (
                <div
                  key={redemption.id}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-3 ${
                    approved
                      ? "border-violet-200 bg-violet-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <Gift
                    className={`h-5 w-5 shrink-0 ${
                      approved ? "text-violet-500" : "text-slate-300"
                    }`}
                  />
                  <p className="flex-1 truncate text-sm font-bold text-slate-700">
                    {reward?.title ?? "Reward"}
                  </p>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-black ${
                      approved
                        ? "bg-violet-100 text-violet-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {approved ? "Ready" : "Pending"}
                  </span>
                </div>
              );
            })}
          </section>
        )}

        <div className="[&>div]:border-cyan-300/40 [&>div]:bg-white">
          <SiblingLeaderboard entries={leaderboard} currentChildId={childId} />
        </div>

        <div className="[&>div]:border-cyan-300/40 [&>div]:bg-white">
          <BadgeGrid
            earnedBadges={
              (earnedBadges ?? []) as { badge_key: string; earned_at: string }[]
            }
          />
        </div>
      </div>
    </div>
  );
}

function HeroStat({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className="text-xs font-black uppercase tracking-wide text-cyan-100">
          {label}
        </span>
      </div>
      <p className="text-xl font-black text-white">{value}</p>
      <p className="text-xs font-bold text-white/70">{detail}</p>
    </div>
  );
}

function DashboardAction({
  href,
  icon,
  title,
  subtitle,
  pill,
  className,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  pill: string;
  className: string;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-36 flex-col items-center justify-between rounded-[1.5rem] bg-gradient-to-br p-3 text-center text-white shadow-[0_8px_0] transition-all hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 active:translate-y-1 active:shadow-[0_4px_0] ${className}`}
    >
      <div className="rounded-2xl bg-white/20 p-2">{icon}</div>
      <div>
        <p className="text-xl font-black uppercase tracking-wide">{title}</p>
        <p className="text-xs font-bold text-white/85">{subtitle}</p>
      </div>
      <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-3 py-1.5 text-xs font-black">
        {pill} <ChevronRight className="h-3 w-3" />
      </span>
    </Link>
  );
}

function GoalPanel({
  childId,
  goalTitle,
  goalCost,
  balance,
  progress,
  canClaim,
}: {
  childId: string;
  goalTitle: string | null;
  goalCost: number;
  balance: number;
  progress: number;
  canClaim: boolean;
}) {
  return (
    <Link
      href={`/kid/${childId}/rewards`}
      className="block rounded-[1.75rem] border border-fuchsia-300/50 bg-[radial-gradient(circle_at_top_left,#701a75_0%,#181044_62%,#080a2c_100%)] p-4 shadow-[0_0_22px_rgba(217,70,239,0.25)] transition-all hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-300 active:translate-y-1"
    >
      <div className="mb-3 flex items-center gap-2">
        <Star className="h-5 w-5 fill-amber-300 text-amber-300" />
        <h2 className="text-lg font-black text-white">My Goal</h2>
      </div>
      {goalTitle ? (
        <>
          <p className="text-base font-black text-white">{goalTitle}</p>
          <div className="mt-3 h-4 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-fuchsia-300 to-amber-300 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-black text-fuchsia-100">
            <span>
              {balance} / {goalCost}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="mt-4 rounded-full bg-emerald-400 px-4 py-2 text-center text-sm font-black text-emerald-950 shadow-[0_3px_0_#047857]">
            {canClaim ? "You can get this!" : "Keep saving"}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/25 bg-white/10 p-4 text-center">
          <p className="text-4xl">🎯</p>
          <p className="mt-2 text-sm font-black text-white">Choose a goal</p>
          <p className="mt-1 text-xs font-bold text-fuchsia-100">
            Pick something fun to save for.
          </p>
        </div>
      )}
    </Link>
  );
}
