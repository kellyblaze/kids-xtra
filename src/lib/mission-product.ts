import type { XtraCoachMission, XtraCoachPlan } from "@/app/actions/ai-actions";

export type MissionCompletionStatus =
  | "available"
  | "in_progress"
  | "pending_approval"
  | "approved"
  | "needs_more_work"
  | "rejected"
  | "missed";

export type MissionStateKey =
  | "available"
  | "in_progress"
  | "waiting_for_check"
  | "approved"
  | "needs_more_work"
  | "completed"
  | "missed";

export type MissionStateInput = {
  doneCount: number;
  timesAllowed: number;
  latestCompletionStatus?: MissionCompletionStatus | null;
  reviewedAt?: string | null;
  rejectionNote?: string | null;
  dueTime?: string | null;
  now?: Date;
};

export type MissionState = {
  key: MissionStateKey;
  childLabel: string;
  parentLabel: string;
  canSubmit: boolean;
  note?: string;
};

export function getMissionState(input: MissionStateInput): MissionState {
  const status = input.latestCompletionStatus;

  if (status === "needs_more_work" || status === "rejected") {
    return {
      key: "needs_more_work",
      childLabel: "Needs More Work",
      parentLabel: "Needs More Work",
      canSubmit: true,
      note: input.rejectionNote?.trim() || "Please try again.",
    };
  }

  if (status === "pending_approval") {
    return {
      key: "waiting_for_check",
      childLabel: "Waiting for Check",
      parentLabel: "Waiting for Parent Check",
      canSubmit: false,
    };
  }

  if (status === "approved" || input.doneCount >= input.timesAllowed) {
    return {
      key: "completed",
      childLabel: "Completed",
      parentLabel: "Approved",
      canSubmit: false,
    };
  }

  if (isPastDueToday(input.dueTime, input.now ?? new Date())) {
    return {
      key: "missed",
      childLabel: "Try Tomorrow",
      parentLabel: "Missed",
      canSubmit: false,
    };
  }

  return {
    key: input.doneCount > 0 ? "in_progress" : "available",
    childLabel: input.doneCount > 0 ? "In Progress" : "Available",
    parentLabel: input.doneCount > 0 ? "In Progress" : "Available",
    canSubmit: true,
  };
}

export type CelebrationKind =
  | "mission_approved"
  | "savings_milestone"
  | "goal_reached"
  | "new_level"
  | "seven_day_streak"
  | "first_reward_redemption";

export type Celebration = {
  kind: CelebrationKind;
  title: string;
  body: string;
};

export type CelebrationInput = {
  approvedMissionCredits?: number;
  approvedMissionXp?: number;
  goalProgressBefore?: number;
  goalProgressAfter?: number;
  previousLevel?: number;
  currentLevel?: number;
  streakCount?: number;
  firstRewardRedeemed?: boolean;
};

export function getCelebrations(input: CelebrationInput): Celebration[] {
  const celebrations: Celebration[] = [];

  if ((input.approvedMissionCredits ?? 0) > 0 || (input.approvedMissionXp ?? 0) > 0) {
    celebrations.push({
      kind: "mission_approved",
      title: "Mission approved!",
      body: `You earned ${input.approvedMissionCredits ?? 0} Credits and ${input.approvedMissionXp ?? 0} XP.`,
    });
  }

  const before = input.goalProgressBefore ?? 0;
  const after = input.goalProgressAfter ?? 0;
  const crossed = [25, 50, 75].find((milestone) => before < milestone && after >= milestone);
  if (crossed) {
    celebrations.push({
      kind: "savings_milestone",
      title: `${crossed}% saved!`,
      body: "Your goal is getting closer.",
    });
  }
  if (before < 100 && after >= 100) {
    celebrations.push({
      kind: "goal_reached",
      title: "Goal reached!",
      body: "You saved enough Credits for your goal.",
    });
  }

  if ((input.currentLevel ?? 0) > (input.previousLevel ?? input.currentLevel ?? 0)) {
    celebrations.push({
      kind: "new_level",
      title: `Level ${input.currentLevel}`,
      body: "Your responsibility growth leveled up.",
    });
  }

  if (input.streakCount === 7) {
    celebrations.push({
      kind: "seven_day_streak",
      title: "7-day streak!",
      body: "That is a strong week of responsibility.",
    });
  }

  if (input.firstRewardRedeemed) {
    celebrations.push({
      kind: "first_reward_redemption",
      title: "First reward requested!",
      body: "You turned earned Credits into a choice.",
    });
  }

  return celebrations;
}

export function updateXtraCoachDraftMission(
  plan: XtraCoachPlan,
  missionIndex: number,
  patch: Partial<XtraCoachMission>,
): XtraCoachPlan {
  const previous = plan.missions[missionIndex];
  if (!previous) return plan;

  const nextMission: XtraCoachMission = {
    ...previous,
    ...patch,
    title: cleanText(patch.title ?? previous.title, 60) || previous.title,
    description: cleanText(patch.description ?? previous.description, 180) || previous.description,
    credit_value: clampInteger(patch.credit_value ?? previous.credit_value, 5, 30),
    xp_value: clampInteger(patch.xp_value ?? previous.xp_value, 5, 40),
    times_per_period: clampInteger(patch.times_per_period ?? previous.times_per_period, 1, 7),
    period_unit:
      patch.period_unit === "week" || patch.period_unit === "month" || patch.period_unit === "day"
        ? patch.period_unit
        : previous.period_unit,
    requires_photo: patch.requires_photo ?? previous.requires_photo,
  };

  const missions = plan.missions.map((mission, index) =>
    index === missionIndex ? nextMission : mission,
  );

  const weeks = plan.weeks.map((week) => ({
    ...week,
    missions: week.missions.map((title) => (title === previous.title ? nextMission.title : title)),
  }));

  return { ...plan, missions, weeks };
}

function isPastDueToday(dueTime: string | null | undefined, now: Date): boolean {
  if (!dueTime || !/^\d{2}:\d{2}$/.test(dueTime)) return false;
  const [hoursRaw, minutesRaw] = dueTime.split(":");
  const hours = Number.parseInt(hoursRaw, 10);
  const minutes = Number.parseInt(minutesRaw, 10);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return false;

  const due = new Date(now);
  due.setHours(hours, minutes, 0, 0);
  return now.getTime() > due.getTime();
}

function cleanText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}
