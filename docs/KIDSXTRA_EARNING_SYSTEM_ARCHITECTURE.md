# KidsXtra Earning System Architecture

## Product Model

KidsXtra should use four child-facing pillars:

- Mission: understandable responsibilities.
- Earn: Credits awarded after parent verification.
- Save & Spend: reward store and savings goals.
- Grow: XP, levels, streaks, and habit progress.

Backend naming can continue using `chores` where that preserves existing data. Child-facing UI should prefer Mission language.

## Current Data Flow

1. Parent creates a mission in `chores`.
2. Parent assigns it through `chore_assignments`.
3. Child completes it through `markChoreComplete`.
4. Completion is stored in `chore_completions` as `pending_approval`, including Mission Photo and checklist progress when present.
5. Parent reviews it in Mission Checks.
6. Approval writes `credits_awarded`, `xp_awarded`, a `credit_transactions` row, XP update, and streak update.
7. Balance is recalculated from the ledger.
8. Child can request a reward through `reward_redemptions`.
9. Parent approval debits Credits through `credit_transactions`.

## Credit Rules

Credits are not money and should never be presented as cash, payout, or banking. Every Credit change should have a `credit_transactions` row before balance changes are treated as trustworthy.

Existing event types support:

- `chore_approved`
- `reward_redeemed`
- `manual_adjustment`
- `bonus`
- `allowance_conversion`
- `family_goal_contribution`

This pass added Bonus Credits through the existing `bonus` type.

## Security Boundaries

Parent mutations use Supabase auth plus `parent_profiles.family_id`. Child mutations use `authorizeChildAccess`. Credit and reward cost changes happen server-side. The privileged reward approval RPC is service-role only in the hardening migration.

Do not move Credit awards, reward debits, or approval decisions into client-side trusted code.

## Support Tables

After approval, migration `0008_earning_system_support_tables.sql` adds:

- `child_goals`: one active reward goal per child.
- `child_badges`: milestone badge awards with uniqueness per child and badge key.
- `rejection_reasons`: family-scoped parent feedback reasons for Needs More Work.
- `chores.checklist_items` and `chore_completions.checklist_completed`: parent-defined Mission steps and child-submitted checklist progress.

These tables carry `family_id`, indexes for family/child access patterns, and forced RLS using the existing `my_family_id()` policy helper.

## Xtra Coach Direction

Xtra Coach now uses `generateXtraCoachPlan` to request structured JSON from the AI provider and validate it before the parent sees it. The validated shape includes plan title, goal, age range, weeks, missions, Credit guidance, XP guidance, and a parent tip.

Generated missions are not automatically assigned. The parent must explicitly add individual missions or the entire reviewed plan. Added missions use the existing `chores` table and can still be edited before assignment.
