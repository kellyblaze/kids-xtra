
# KidsXtra Supabase RLS Audit

**Date:** 2026-11-20
**Migrations reviewed:** 0001 through 0012

## Methodology

For each table: (1) confirm RLS is enabled and FORCE RLS is set, (2) review USING/WITH CHECK clauses, (3) confirm no missing operations, (4) verify least-privilege grants.

The `my_family_id()` helper (STABLE, SECURITY DEFINER, search_path locked in 0007) is used in all policies. It returns the authenticated parent's family_id — returns NULL for unauthenticated requests, causing all policies to fail-closed.

---

## `families`

- RLS: Yes | FORCE RLS: Not explicit (write revoked in 0007 from authenticated)
- `families_select`: `id = my_family_id()` — PASS
- `families_update`: `id = my_family_id()` — PASS
- INSERT/DELETE: Blocked by privilege revocation (migration 0007)
- **PASS**

---

## `parent_profiles`

- RLS: Yes | Write revoked from authenticated in 0007
- `parent_profiles_select`: `family_id = my_family_id()` — PASS (co-parents visible within family)
- `parent_profiles_update`: `id = auth.uid()` — PASS (can only update own row)
- **PASS**

---

## `child_profiles`

- RLS: Yes | FORCE RLS: Yes
- SELECT / INSERT / UPDATE / DELETE — all use `family_id = my_family_id()`
- Admin client used in kid-login (no parent JWT); app enforces family scoping manually
- **PASS**

---

## `chores`

- RLS: Yes | FORCE RLS: Yes
- SELECT / INSERT / UPDATE / DELETE — all `family_id = my_family_id()`
- **PASS**

---

## `chore_assignments`

- RLS: Yes | FORCE RLS: Yes
- SELECT / INSERT / DELETE — all `family_id = my_family_id()`
- No UPDATE policy — assignments are immutable by design
- **PASS**

---

## `chore_completions`

- RLS: Yes | FORCE RLS: Yes
- SELECT / INSERT / UPDATE — all `family_id = my_family_id()`
- `markChoreComplete` uses admin client; application checks child_id + family_id before insert
- **PASS**

---

## `credit_transactions`

- RLS: Yes | FORCE RLS: Yes
- SELECT / INSERT — `family_id = my_family_id()`
- No UPDATE/DELETE — intentionally immutable ledger; balance computed by SECURITY DEFINER RPC
- **PASS**

---

## `rewards`

- RLS: Yes | FORCE RLS: Yes
- SELECT / INSERT / UPDATE / DELETE — `family_id = my_family_id()`
- **PASS**

---

## `reward_redemptions`

- RLS: Yes | FORCE RLS: Yes
- SELECT / INSERT / UPDATE — `family_id = my_family_id()`
- Approval via `approve_reward_redemption` SECURITY DEFINER (service_role only)
- **PASS**

---

## `activity_logs`

- RLS: Yes | FORCE RLS: Yes
- SELECT / INSERT — `family_id = my_family_id()`
- Immutable — no UPDATE/DELETE
- **PASS**

---

## `family_settings`

- RLS: Yes | FORCE RLS: Yes
- SELECT / INSERT / UPDATE — `family_id = my_family_id()`
- **PASS**

---

## `child_streaks`

- Source: Migration 0004
- **CONCERN:** Migration 0004 creates the table but does not explicitly enable RLS or add policies.
- All writes go through SECURITY DEFINER functions (service_role), but unauthenticated or cross-family reads may be possible if RLS is not set.
- **Action required:** Verify in Supabase dashboard. If RLS is not enabled, apply:
  ```sql
  ALTER TABLE public.child_streaks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.child_streaks FORCE ROW LEVEL SECURITY;
  CREATE POLICY "child_streaks_select" ON public.child_streaks
    FOR SELECT USING (family_id = my_family_id());
  REVOKE INSERT, UPDATE, DELETE ON public.child_streaks FROM PUBLIC, anon, authenticated;
  ```
- **NEEDS VERIFICATION**

---

## `child_goals`

- Source: Migration 0008 — RLS: Yes | FORCE RLS: Yes
- SELECT / INSERT / UPDATE / DELETE — `family_id = my_family_id()`
- **PASS**

---

## `child_badges`

- Source: Migration 0008 — RLS: Yes | FORCE RLS: Yes
- SELECT: `family_id = my_family_id()` — PASS
- INSERT: `family_id = my_family_id()` — PASS
- No UPDATE/DELETE — badges are immutable once earned
- **PASS**

---

## `auth_rate_limits`

- Source: Migration 0005
- RLS: Yes | FORCE RLS: Yes
- `REVOKE ALL FROM PUBLIC, anon, authenticated` — only callable via consume_auth_rate_limit SECURITY DEFINER RPC
- **PASS — strongest posture in the schema**

---

## `push_subscriptions`, `push_subscription_recipients`, `mission_progress`, `mission_reminder_deliveries`

- Source: Migration 0012
- **CONCERN:** Migration 0012 does not include explicit RLS ENABLE statements for these tables.
- All application writes use the admin client (bypasses RLS), but if RLS is not enabled, authenticated users could read or modify push subscriptions cross-family via the Supabase REST API.
- **Action required:** Verify in Supabase dashboard. If not enabled, apply for each table:
  ```sql
  ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.<table> FORCE ROW LEVEL SECURITY;
  CREATE POLICY "<table>_select" ON public.<table>
    FOR SELECT USING (family_id = my_family_id());
  REVOKE INSERT, UPDATE, DELETE ON public.<table> FROM PUBLIC, anon, authenticated;
  ```
- **NEEDS VERIFICATION**

---

## Privileged Functions (SECURITY DEFINER)

| Function | Restricted to | Assessment |
|----------|--------------|------------|
| `recalculate_child_balance(uuid)` | service_role | PASS — revoked from anon/authenticated in 0007 |
| `update_child_streak(uuid)` | service_role | PASS |
| `award_xp(uuid, integer)` | service_role | PASS |
| `approve_reward_redemption(uuid, uuid, uuid)` | service_role | PASS — includes FOR UPDATE row lock |
| `consume_auth_rate_limit(text, int, int, int)` | service_role | PASS — revoked in 0005 |
| `my_family_id()` | STABLE helper | search_path locked in 0007 — PASS |

Migration 0007 includes a self-verification DO block that raises an EXCEPTION if privileges are not correctly revoked — prevents silent misconfiguration.
