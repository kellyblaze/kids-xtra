import test from "node:test"
import assert from "node:assert/strict"

import { calculateLevelProgress, summarizeWeeklyChild } from "../src/lib/weekly-report.ts"

test("summarizeWeeklyChild separates earned, spent, and saved Credits", () => {
  const summary = summarizeWeeklyChild({
    childId: "child-1",
    childName: "Jayden",
    level: 4,
    xpTotal: 720,
    currentStreak: 6,
    activities: [
      { event_type: "chore_approved", metadata: { credits: "30" } },
      { event_type: "chore_approved", metadata: { credits: "20" } },
      { event_type: "reward_approved", metadata: { reward_title: "Movie" } },
    ],
    transactions: [{ amount: 30 }, { amount: 20 }, { amount: -15 }],
  })

  assert.equal(summary.missionsCompleted, 2)
  assert.equal(summary.creditsEarned, 50)
  assert.equal(summary.creditsSpent, 15)
  assert.equal(summary.creditsSaved, 35)
  assert.equal(summary.rewardsRedeemed, 1)
  assert.equal(summary.currentStreak, 6)
})

test("calculateLevelProgress clamps to the display range", () => {
  assert.equal(calculateLevelProgress(-100, 1), 0)
  assert.equal(calculateLevelProgress(10_000, 1), 100)
})
