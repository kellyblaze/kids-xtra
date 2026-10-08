import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getCelebrations,
  getMissionState,
  updateXtraCoachDraftMission,
} from "../src/lib/mission-product.ts";

test("getMissionState exposes needs_more_work as a first-class child state", () => {
  const state = getMissionState({
    doneCount: 0,
    timesAllowed: 1,
    latestCompletionStatus: "needs_more_work",
    reviewedAt: "2026-10-06T10:00:00.000Z",
    rejectionNote: "Put the shoes in the closet too.",
  });

  assert.equal(state.key, "needs_more_work");
  assert.equal(state.childLabel, "Needs More Work");
  assert.equal(state.parentLabel, "Needs More Work");
  assert.equal(state.canSubmit, true);
  assert.equal(state.note, "Put the shoes in the closet too.");
});

test("getMissionState marks an overdue daily mission as missed", () => {
  const state = getMissionState({
    doneCount: 0,
    timesAllowed: 1,
    dueTime: "08:00",
    now: new Date("2026-10-06T18:00:00.000Z"),
  });

  assert.equal(state.key, "missed");
  assert.equal(state.childLabel, "Try Tomorrow");
  assert.equal(state.canSubmit, false);
});

test("getCelebrations keeps celebrations lightweight and event based", () => {
  const celebrations = getCelebrations({
    approvedMissionCredits: 30,
    approvedMissionXp: 15,
    goalProgressBefore: 49,
    goalProgressAfter: 75,
    currentLevel: 5,
    previousLevel: 4,
    streakCount: 7,
    firstRewardRedeemed: true,
  });

  assert.deepEqual(
    celebrations.map((celebration) => celebration.kind),
    [
      "mission_approved",
      "savings_milestone",
      "new_level",
      "seven_day_streak",
      "first_reward_redemption",
    ],
  );
});

test("updateXtraCoachDraftMission edits a mission without mutating the source plan", () => {
  const plan = {
    plan_title: "Morning Plan",
    goal: "Morning Independence",
    age_range: "Ages 8-9",
    weeks: [{ week: 1, focus: "Start small", missions: ["Pack Bag"] }],
    missions: [
      {
        week: 1,
        title: "Pack Bag",
        description: "Pack your school bag.",
        category: "morning_routine",
        credit_value: 10,
        xp_value: 15,
        frequency: "daily",
        times_per_period: 1,
        period_unit: "day" as const,
        requires_photo: false,
      },
    ],
    credit_recommendation: "Keep daily missions small.",
    xp_recommendation: "Use XP for growth.",
    parent_tip: "Review before adding.",
  };

  const next = updateXtraCoachDraftMission(plan, 0, {
    title: "Backpack Ready",
    credit_value: 25,
    requires_photo: true,
  });

  assert.equal(plan.missions[0].title, "Pack Bag");
  assert.equal(next.missions[0].title, "Backpack Ready");
  assert.equal(next.missions[0].credit_value, 25);
  assert.equal(next.missions[0].requires_photo, true);
  assert.deepEqual(next.weeks[0].missions, ["Backpack Ready"]);
});
