export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import {
  Gift,
  PiggyBank,
  ShoppingBag,
  Sparkles,
  Star,
  Target,
  Trophy,
} from "lucide-react";
import { GoalButton } from "@/components/kid/GoalButton";
import { RedeemButton } from "@/components/kid/RedeemButton";
import { authorizeChildAccess } from "@/lib/kid-authorization";
import { createAdminClient } from "@/lib/supabase/admin";
import { REWARD_CATEGORIES } from "@/lib/constants";

interface PageProps {
  params: Promise<{ childId: string }>;
}

type RewardItem = {
  id: string;
  title: string;
  description: string | null;
  credit_cost: number;
  category: string | null;
  quantity_available: number | null;
  quantity_redeemed: number | null;
  family_id: string;
};

const REWARD_EMOJI = new Map(
  REWARD_CATEGORIES.map((category) => [category.value, category.emoji]),
);

function getRewardEmoji(category: string | null) {
  return category ? (REWARD_EMOJI.get(category) ?? "🎁") : "🎁";
}

export default async function KidRewardsPage({ params }: PageProps) {
  const { childId } = await params;

  if (!(await authorizeChildAccess(childId))) redirect("/kids");

  const admin = createAdminClient();

  const [
    { data: child },
    { data: rewards },
    { data: pendingRedemptions },
    { data: goalRow },
  ] = await Promise.all([
    admin
      .from("child_profiles")
      .select("credit_balance, family_id")
      .eq("id", childId)
      .single(),

    admin
      .from("rewards")
      .select(
        "id, title, description, credit_cost, category, quantity_available, quantity_redeemed, family_id",
      )
      .eq("is_active", true)
      .order("credit_cost"),

    admin
      .from("reward_redemptions")
      .select("reward_id")
      .eq("child_id", childId)
      .eq("status", "requested"),

    admin
      .from("child_goals")
      .select("reward_id, rewards(title, credit_cost)")
      .eq("child_id", childId)
      .maybeSingle(),
  ]);

  if (!child) redirect("/kid/select");

  const familyRewards =
    ((rewards as RewardItem[] | null) ?? []).filter(
      (reward) => reward.family_id === child.family_id,
    ) ?? [];
  const pendingSet = new Set(
    pendingRedemptions?.map((redemption) => redemption.reward_id) ?? [],
  );
  const currentGoalRewardId = goalRow?.reward_id ?? null;
  const goalReward = (() => {
    if (!goalRow) return null;
    const reward = Array.isArray(goalRow.rewards)
      ? goalRow.rewards[0]
      : goalRow.rewards;
    return reward as { title: string; credit_cost: number } | null;
  })();
  const balance = child.credit_balance ?? 0;
  const readyNow = familyRewards.filter(
    (reward) =>
      balance >= reward.credit_cost &&
      !pendingSet.has(reward.id) &&
      !isOutOfStock(reward),
  );
  const savingFor = familyRewards.filter(
    (reward) =>
      balance < reward.credit_cost &&
      !pendingSet.has(reward.id) &&
      !isOutOfStock(reward),
  );
  const requestedCount = pendingSet.size;
  const goalProgress =
    goalReward && goalReward.credit_cost > 0
      ? Math.min(100, Math.round((balance / goalReward.credit_cost) * 100))
      : 0;

  if (!familyRewards.length) {
    return (
      <div className="-mx-4 -my-5 min-h-[calc(100vh-8rem)] bg-[#070a2c] px-4 py-8 text-white">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-cyan-300/40 bg-[radial-gradient(circle_at_top_left,#5b21b6_0%,#10105a_42%,#070a2c_100%)] p-6 text-center shadow-[0_18px_50px_rgba(20,184,166,0.2)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 text-5xl">
            🎁
          </div>
          <h1 className="mt-4 text-3xl font-black">No rewards yet</h1>
          <p className="mt-2 text-sm font-bold text-cyan-100">
            Your parent will add rewards you can earn with Credits.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-4 -my-5 min-h-[calc(100vh-8rem)] bg-[#070a2c] px-4 py-5 text-white">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/40 bg-[radial-gradient(circle_at_top_left,#7e22ce_0%,#11104d_42%,#070a2c_78%)] p-5 shadow-[0_18px_50px_rgba(217,70,239,0.18)]">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-fuchsia-400/25 blur-3xl" />
          <div className="relative grid gap-5 sm:grid-cols-[1fr_220px] sm:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-cyan-100">
                <Sparkles className="h-3.5 w-3.5" />
                Reward Shop
              </div>
              <h1 className="text-3xl font-black leading-tight sm:text-5xl">
                Choose your prize.
              </h1>
              <p className="mt-2 max-w-xl text-sm font-bold text-cyan-100 sm:text-base">
                Spend now, save for later, or set your next goal.
              </p>
            </div>
            <div className="rounded-[1.75rem] border-2 border-amber-300/60 bg-slate-950/70 p-5 text-center shadow-[0_0_24px_rgba(251,191,36,0.35)]">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-amber-300 text-3xl shadow-[0_0_22px_rgba(251,191,36,0.65)]">
                ⭐
              </div>
              <p className="text-5xl font-black leading-none">{balance}</p>
              <p className="mt-1 text-sm font-black uppercase tracking-wide text-amber-100">
                Credits to spend
              </p>
            </div>
          </div>
          <div className="relative mt-5 grid grid-cols-3 gap-3">
            <ShopStat
              icon={<ShoppingBag className="h-5 w-5 text-emerald-200" />}
              label="Ready"
              value={readyNow.length}
            />
            <ShopStat
              icon={<PiggyBank className="h-5 w-5 text-cyan-200" />}
              label="Saving"
              value={savingFor.length}
            />
            <ShopStat
              icon={<Gift className="h-5 w-5 text-fuchsia-200" />}
              label="Asked"
              value={requestedCount}
            />
          </div>
        </section>

        {goalReward && (
          <section className="rounded-[1.75rem] border border-fuchsia-300/50 bg-[radial-gradient(circle_at_top_left,#701a75_0%,#181044_62%,#080a2c_100%)] p-4 shadow-[0_0_22px_rgba(217,70,239,0.25)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black">
                  <Target className="h-5 w-5 text-amber-300" />
                  My Goal
                </h2>
                <p className="mt-1 text-sm font-bold text-fuchsia-100">
                  {goalReward.title}
                </p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-fuchsia-100">
                {goalProgress}%
              </span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-fuchsia-300 to-amber-300 transition-all"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs font-black text-fuchsia-100">
              <span>
                {balance} / {goalReward.credit_cost}
              </span>
              <span>
                {goalProgress >= 100 ? "Ready to get" : "Keep saving"}
              </span>
            </div>
          </section>
        )}

        {readyNow.length > 0 && (
          <RewardShelf
            title="Ready Now"
            count={`${readyNow.length} reward${readyNow.length === 1 ? "" : "s"}`}
            icon={<Trophy className="h-5 w-5 text-amber-300" />}
          >
            {readyNow.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                childId={childId}
                balance={balance}
                pendingSet={pendingSet}
                currentGoalRewardId={currentGoalRewardId}
                goalReward={goalReward}
              />
            ))}
          </RewardShelf>
        )}

        {savingFor.length > 0 && (
          <RewardShelf
            title="Save For Later"
            count={`${savingFor.length} reward${savingFor.length === 1 ? "" : "s"}`}
            icon={<PiggyBank className="h-5 w-5 text-cyan-200" />}
          >
            {savingFor.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                childId={childId}
                balance={balance}
                pendingSet={pendingSet}
                currentGoalRewardId={currentGoalRewardId}
                goalReward={goalReward}
              />
            ))}
          </RewardShelf>
        )}

        {familyRewards.some(
          (reward) => pendingSet.has(reward.id) || isOutOfStock(reward),
        ) && (
          <RewardShelf
            title="Already Asked"
            count="status"
            icon={<Gift className="h-5 w-5 text-fuchsia-200" />}
          >
            {familyRewards
              .filter((reward) => pendingSet.has(reward.id) || isOutOfStock(reward))
              .map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  childId={childId}
                  balance={balance}
                  pendingSet={pendingSet}
                  currentGoalRewardId={currentGoalRewardId}
                  goalReward={goalReward}
                />
              ))}
          </RewardShelf>
        )}
      </div>
    </div>
  );
}

function isOutOfStock(reward: RewardItem) {
  if (reward.quantity_available == null) return false;
  return reward.quantity_available - (reward.quantity_redeemed ?? 0) <= 0;
}

function getRemaining(reward: RewardItem) {
  if (reward.quantity_available == null) return null;
  return reward.quantity_available - (reward.quantity_redeemed ?? 0);
}

function ShopStat({
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

function RewardShelf({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-black text-white">
          {icon}
          {title}
        </h2>
        <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-cyan-100">
          {count}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function RewardCard({
  reward,
  childId,
  balance,
  pendingSet,
  currentGoalRewardId,
  goalReward,
}: {
  reward: RewardItem;
  childId: string;
  balance: number;
  pendingSet: Set<string>;
  currentGoalRewardId: string | null;
  goalReward: { title: string; credit_cost: number } | null;
}) {
  const remaining = getRemaining(reward);
  const canAfford = balance >= reward.credit_cost;
  const outOfStock = isOutOfStock(reward);
  const alreadyPending = pendingSet.has(reward.id);
  const isGoal = currentGoalRewardId === reward.id;
  const dim = outOfStock || alreadyPending;
  const progress =
    reward.credit_cost > 0
      ? Math.min(100, Math.round((balance / reward.credit_cost) * 100))
      : 100;

  return (
    <article
      className={`rounded-[1.75rem] border p-4 shadow-[0_8px_0_rgba(15,23,42,0.3)] ${
        isGoal
          ? "border-fuchsia-300/60 bg-[radial-gradient(circle_at_top_left,#701a75_0%,#181044_62%,#080a2c_100%)]"
          : dim
            ? "border-slate-300/20 bg-slate-200/10 opacity-75"
            : canAfford
              ? "border-amber-300/50 bg-amber-300/15"
              : "border-cyan-300/40 bg-slate-950/75"
      }`}
    >
      <div className="flex gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white text-4xl shadow-[0_5px_0_#dbe2ea]">
          {getRewardEmoji(reward.category)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {isGoal && (
              <span className="rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-black text-fuchsia-700">
                My Goal
              </span>
            )}
            {canAfford && !outOfStock && !alreadyPending && (
              <span className="rounded-full bg-emerald-300 px-3 py-1 text-xs font-black text-emerald-950">
                Ready
              </span>
            )}
            {!canAfford && !outOfStock && !alreadyPending && (
              <span className="rounded-full bg-cyan-300/15 px-3 py-1 text-xs font-black text-cyan-100">
                Save
              </span>
            )}
            {alreadyPending && (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
                Requested
              </span>
            )}
            {outOfStock && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                Out of stock
              </span>
            )}
          </div>
          <h3 className="text-lg font-black leading-tight text-white">
            {reward.title}
          </h3>
          {reward.description && (
            <p className="mt-1 line-clamp-2 text-sm font-bold text-cyan-100/80">
              {reward.description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 p-3">
        <div className="mb-2 flex items-center justify-between text-xs font-black text-cyan-100">
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
            {reward.credit_cost} Credits
          </span>
          <span>{Math.min(balance, reward.credit_cost)} saved</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-fuchsia-300 to-amber-300 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {remaining !== null && !outOfStock && (
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-cyan-100">
              {remaining} left
            </span>
          )}
          {!canAfford && (
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-cyan-100">
              Need {reward.credit_cost - balance} more
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {!outOfStock && !alreadyPending && (
          <RedeemButton
            rewardId={reward.id}
            childId={childId}
            canAfford={canAfford}
            creditCost={reward.credit_cost}
            balance={balance}
            goalTitle={isGoal ? null : goalReward?.title}
            goalCost={isGoal ? null : goalReward?.credit_cost}
          />
        )}
        {!outOfStock && (
          <GoalButton
            childId={childId}
            rewardId={reward.id}
            isCurrentGoal={isGoal}
          />
        )}
      </div>
    </article>
  );
}
