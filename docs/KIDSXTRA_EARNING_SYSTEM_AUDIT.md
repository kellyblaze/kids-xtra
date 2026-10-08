# KidsXtra Earning System Audit

Audit date: 2026-10-06

Scope inspected: `src/app`, `src/components`, `src/lib`, `src/types/database.ts`, and `supabase/migrations`.

## Summary

KidsXtra already contains the foundation for a Kids Responsibility & Earning System. The app has parent accounts, child profiles, child PIN access, assignments, Mission-like child pages, photo proof, parent approval, Credits, a Credit transaction ledger, rewards, reward redemption, savings goals in code, XP, streaks, starter packs, onboarding, reminders, weekly report endpoint, and activity history.

The largest gaps are not basic feature absence. They are terminology consistency, schema drift, safer product documentation, structured Xtra Coach plan generation, tests, and migration-backed support for tables that current code already references.

## Feature Classification

| Feature | Status | Evidence / Notes |
| --- | --- | --- |
| Children | EXISTS | `child_profiles`, parent child pages, child creation actions, onboarding. |
| Parent accounts | EXISTS | Supabase auth plus `parent_profiles`; RLS policies isolate by family. |
| Missions / chores | EXISTS BUT NEEDS IMPROVEMENT | Stored as `chores`; child routes already use `/missions`. UI language was mixed. |
| Task completion | EXISTS | `markChoreComplete` creates `chore_completions` with `pending_approval`. |
| Credits / points | EXISTS | `credit_balance` plus `credit_transactions`; Credits are separate from XP. |
| XP | EXISTS BUT NEEDS IMPROVEMENT | `xp_total`, `level`, `award_xp`; parent create/edit forms did not expose XP before this pass. |
| Streaks | EXISTS | `child_streaks` migration and `update_child_streak` RPC. |
| Rewards | EXISTS | `rewards` table, parent and child reward pages. |
| Reward redemption | EXISTS | `reward_redemptions`, parent approval RPC debits Credits through ledger. |
| Savings goals | EXISTS AFTER THIS PASS | Code uses `child_goals` and UI renders goals; migration `0008` now defines the support table. |
| Photo proof | EXISTS | `requires_photo`, private `chore-photos` bucket, upload route, parent display. |
| Schedules | EXISTS | Frequency, custom days, period units, due time, weekly schedule grid. |
| Reminders | EXISTS | `send-chore-reminders` task and push infrastructure. |
| Xtra Coach / AI plans | EXISTS AFTER THIS PASS | `generateXtraCoachPlan` returns validated structured plans; parent reviews and explicitly adds missions. |
| Weekly reports | EXISTS AFTER THIS PASS | Report now summarizes Missions, Credits earned/saved/spent, redemptions, streak, level progress, biggest win, and next step. |
| Activity history | EXISTS | `activity_logs` table and parent activity/dashboard usage. |
| Notifications | EXISTS BUT NEEDS IMPROVEMENT | Push notifications exist; some language still says chore/task. |
| Database schema | EXISTS BUT NEEDS REVIEW | Core schema exists; migration `0008` adds support tables previously referenced by code. |
| Supabase RLS | EXISTS BUT NEEDS REVIEW | RLS is enabled on core tables; privileged RPCs hardened in `0007`; migration `0008` enables and forces RLS on new support tables. |
| API routes | EXISTS | Kid login/upload/photo, push, export, Stripe, scheduled tasks. |
| Server Actions | EXISTS | Actions for auth, children, chores, completions, approvals, rewards, goals, AI, onboarding. |
| Child login/access | EXISTS | Family code plus child PIN/session authorization. |
| Parent approval | EXISTS | Parent approvals page and `approveChoreCompletion`. |
| Needs More Work | PARTIAL | Rejection note returns mission to child, but DB status remains `rejected`; UI now presents this as Needs More Work. |
| Mobile layouts | EXISTS BUT NEEDS IMPROVEMENT | Mobile-first classes are common; full viewport QA still needed. |
| Credit ledger reliability | EXISTS | Credits are awarded/debited through `credit_transactions`; balance recalculation RPC exists. |
| Parent bonus Credits | EXISTS AFTER THIS PASS | Added server action and child detail UI using existing `bonus` ledger type. |
| Spend-vs-save awareness | EXISTS AFTER THIS PASS | Reward redemption now warns when spending would slow an active savings goal. |
| Mission checklist/subtasks | EXISTS AFTER THIS PASS | Migration `0009` adds checklist fields; parent create/edit, child completion, and Mission Check review now use them. |

## Schema Drift Reconciled After Approval

After explicit approval, migration `0008_earning_system_support_tables.sql` was added for:

- `child_goals`
- `child_badges`
- `rejection_reasons`

The migration is additive, preserves rows where tables already exist, backfills `family_id` where possible, indexes family/child lookup paths, and enables plus forces RLS on the new support tables.

## Implementation Completed In This Pass

- Changed parent create/edit chore forms toward Mission language.
- Exposed XP reward and Mission Photo requirement in parent create/edit flows.
- Persisted `xp_value` and `requires_photo` in create/edit actions.
- Added parent Bonus Credits action and form using the existing `credit_transactions` ledger and `recalculate_child_balance`.
- Improved Mission Check wording in approvals and parent feedback actions.
- Added child dashboard weekly earned/spent Credit summary.
- Added spend-vs-save awareness before child reward redemption when a different savings goal is active.
- Added migration-backed support for goals, milestone badges, and Mission Check feedback reasons.
- Reworked AI suggestions into structured Xtra Coach Mission Plans with schema validation and parent review before activation.
- Added Mission checklist support.
- Improved weekly reports around Mission/Earn/Save/Grow metrics.
- Added reward fulfillment action and UI.
- Added automated tests and `npm test`.

## Rollback Path

Application changes are reversible by reverting this implementation commit or these edited files. Migration `0008` is additive; roll back by dropping the three support tables only after confirming their data is disposable or backed up.
