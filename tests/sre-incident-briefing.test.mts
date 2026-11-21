import test from "node:test";
import assert from "node:assert/strict";
import { formatIncidentBriefing } from "../src/lib/incident-briefing.ts";
import type { AlertPayload } from "../src/lib/alerts.ts";

const base: AlertPayload = {
  severity: "P1",
  title: "DB connection pool exhausted",
  service: "api",
  summary: "Connection pool hit 100% utilization for 3 minutes.",
  firstSeen: "2026-11-21T08:00:00Z",
  latestSeen: "2026-11-21T08:03:00Z",
  count: 42,
  fingerprint: "db-pool-exhausted",
};

test("formatIncidentBriefing includes severity, service, and title", () => {
  const brief = formatIncidentBriefing(base);
  assert.ok(brief.includes("P1"));
  assert.ok(brief.includes("api"));
  assert.ok(brief.includes("DB connection pool exhausted"));
});

test("formatIncidentBriefing includes fingerprint-based branch name", () => {
  const brief = formatIncidentBriefing(base);
  assert.ok(brief.includes("fix/sre-db-pool-exhausted"));
});

test("formatIncidentBriefing includes constraints section", () => {
  const brief = formatIncidentBriefing(base);
  assert.ok(brief.includes("Do not suggest changes that expose child PII"));
  assert.ok(brief.includes("Do not suggest disabling authentication or RLS"));
});

test("formatIncidentBriefing omits remediation section when hint is absent", () => {
  const brief = formatIncidentBriefing(base);
  assert.ok(!brief.includes("Suggested remediation"));
});

test("formatIncidentBriefing includes remediation section when hint is present", () => {
  const brief = formatIncidentBriefing({
    ...base,
    remediationHint: "Increase pool size in DATABASE_URL config.",
  });
  assert.ok(brief.includes("Suggested remediation"));
  assert.ok(brief.includes("Increase pool size"));
});

test("sanitize strips email addresses from summary", () => {
  const brief = formatIncidentBriefing({
    ...base,
    summary: "Error triggered by user admin@example.com",
  });
  assert.ok(!brief.includes("admin@example.com"));
  assert.ok(brief.includes("[email]"));
});

test("sanitize strips UUIDs from summary", () => {
  const brief = formatIncidentBriefing({
    ...base,
    summary: "Session 550e8400-e29b-41d4-a716-446655440000 expired",
  });
  assert.ok(!brief.includes("550e8400-e29b-41d4-a716-446655440000"));
  assert.ok(brief.includes("[uuid]"));
});

test("sanitize strips long numeric IDs (7+ digits) from summary", () => {
  const brief = formatIncidentBriefing({
    ...base,
    summary: "Child record 1234567 not found",
  });
  assert.ok(!brief.includes("1234567"));
  assert.ok(brief.includes("[id]"));
});

test("sanitize preserves short numbers", () => {
  const brief = formatIncidentBriefing({
    ...base,
    summary: "Error rate 42 per minute",
  });
  assert.ok(brief.includes("42"));
});

test("sanitize also strips PII from remediationHint", () => {
  const brief = formatIncidentBriefing({
    ...base,
    remediationHint: "Contact support@kidsxtra.cc for UUID 550e8400-e29b-41d4-a716-446655440000",
  });
  assert.ok(!brief.includes("support@kidsxtra.cc"));
  assert.ok(!brief.includes("550e8400-e29b-41d4-a716-446655440000"));
});
