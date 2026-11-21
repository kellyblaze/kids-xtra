import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReminderStages,
  getLocalDateKey,
  isMissionScheduledToday,
  isQuietTime,
  isReminderDue,
  isValidTimeZone,
  zonedDateTimeToUtc,
} from "../src/lib/reminders.ts";

test("converts a local Mission due time to UTC", () => {
  const due = zonedDateTimeToUtc(
    "2026-10-14",
    "17:00",
    "America/New_York",
  );
  assert.equal(due?.toISOString(), "2026-10-14T21:00:00.000Z");
});

test("builds get-ready, due, and follow-up reminder stages", () => {
  const stages = buildReminderStages({
    dueOn: "2026-10-14",
    dueTime: "17:00",
    timeZone: "America/New_York",
    minutesBefore: 15,
    followUpMinutes: 30,
  });

  assert.deepEqual(
    stages.map((stage) => [stage.kind, stage.scheduledFor.toISOString()]),
    [
      ["get_ready", "2026-10-14T20:45:00.000Z"],
      ["due", "2026-10-14T21:00:00.000Z"],
      ["follow_up", "2026-10-14T21:30:00.000Z"],
    ],
  );
});

test("a snooze replaces remaining reminder stages", () => {
  const stages = buildReminderStages({
    dueOn: "2026-10-14",
    dueTime: "17:00",
    timeZone: "America/New_York",
    minutesBefore: 15,
    followUpMinutes: 30,
    snoozedUntil: "2026-10-14T21:10:00.000Z",
  });
  assert.deepEqual(stages.map((stage) => stage.kind), ["snooze"]);
});

test("quiet hours work when they cross midnight", () => {
  assert.equal(
    isQuietTime(
      new Date("2026-10-15T02:30:00.000Z"),
      "America/New_York",
      "20:00",
      "07:00",
    ),
    true,
  );
  assert.equal(
    isQuietTime(
      new Date("2026-10-14T16:00:00.000Z"),
      "America/New_York",
      "20:00",
      "07:00",
    ),
    false,
  );
});

test("reminders only run once inside the delivery grace window", () => {
  const scheduled = new Date("2026-10-14T21:00:00.000Z");
  assert.equal(
    isReminderDue(scheduled, new Date("2026-10-14T21:05:00.000Z")),
    true,
  );
  assert.equal(
    isReminderDue(scheduled, new Date("2026-10-14T21:20:00.000Z")),
    false,
  );
});

test("custom Missions honor their selected weekdays", () => {
  assert.equal(
    isMissionScheduledToday({
      frequency: "custom",
      periodUnit: "day",
      customDays: [1, 3, 5],
      weekday: 3,
    }),
    true,
  );
  assert.equal(
    isMissionScheduledToday({
      frequency: "weekly",
      periodUnit: "week",
      customDays: null,
      weekday: 3,
    }),
    false,
  );
});

test("timezone validation and local date keys reject guesses", () => {
  assert.equal(isValidTimeZone("America/New_York"), true);
  assert.equal(isValidTimeZone("Mars/Olympus"), false);
  assert.equal(
    getLocalDateKey(
      new Date("2026-10-15T02:00:00.000Z"),
      "America/New_York",
    ),
    "2026-10-14",
  );
});
