import { readFileSync } from "node:fs"
import test from "node:test"
import assert from "node:assert/strict"

test("earning support migration forces RLS on new support tables", () => {
  const sql = readFileSync("supabase/migrations/0008_earning_system_support_tables.sql", "utf8")

  for (const table of ["child_goals", "child_badges", "rejection_reasons"]) {
    assert.match(sql, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`))
    assert.match(sql, new RegExp(`ALTER TABLE public\\.${table} FORCE ROW LEVEL SECURITY`))
  }
})

test("mission checklist migration is additive", () => {
  const sql = readFileSync("supabase/migrations/0009_mission_checklists.sql", "utf8")

  assert.match(sql, /ADD COLUMN IF NOT EXISTS checklist_items/)
  assert.match(sql, /ADD COLUMN IF NOT EXISTS checklist_completed/)
  assert.doesNotMatch(sql, /DROP TABLE|DROP COLUMN/i)
})

test("needs more work migration adds a first-class completion state", () => {
  const sql = readFileSync("supabase/migrations/0010_needs_more_work_status.sql", "utf8")
  const backfillSql = readFileSync("supabase/migrations/0011_backfill_needs_more_work_status.sql", "utf8")

  assert.match(sql, /ALTER TYPE public\.completion_status ADD VALUE IF NOT EXISTS 'needs_more_work'/i)
  assert.match(backfillSql, /UPDATE public\.chore_completions\s+SET status = 'needs_more_work'/i)
  assert.doesNotMatch(sql, /DROP TABLE|DROP COLUMN|TRUNCATE/i)
  assert.doesNotMatch(backfillSql, /DROP TABLE|DROP COLUMN|TRUNCATE/i)
})
