# KidsXtra Earning System Release Notes

## What Changed

- Parent mission creation and editing now expose Credit reward, XP reward, and Mission Photo requirement.
- Parent-facing review language now uses Mission Check and Needs More Work.
- Parent child detail pages now support awarding Bonus Credits with a reason.
- Child dashboard now highlights My Credits with earned/spent totals for the current week.
- Child reward redemption now shows a spend-vs-save awareness prompt when spending would slow progress toward a different active goal.
- Migration `0008` now adds support tables for child goals, child badges, and family Mission Check feedback reasons.
- Xtra Coach now generates structured Mission Plans with parent inputs, validated mission data, and explicit parent add actions.
- Mission checklist items can now be defined by parents, checked by kids, and reviewed during Mission Check.
- Weekly reports now summarize Missions, Credits earned/saved/spent, reward redemptions, streaks, level progress, biggest win, and next step.
- Reward redemptions can now be marked fulfilled after approval.
- Parent dashboard now surfaces weekly Credit activity and active savings goals.
- A lightweight `npm test` suite now covers weekly report math and migration safety checks.
- Required earning-system audit, architecture, tests, and release docs were added.

## Data Safety

Migration `0008_earning_system_support_tables.sql` is additive. Existing production data is preserved, and existing rows are backfilled with `family_id` where the table already exists. New Bonus Credits use the existing `credit_transactions` table and existing `bonus` transaction type.

## Verification

- `npm run lint` passed.
- `npm run build` passed.
- `npm test` passed.

## Remaining Approval Gates

Explicit approval is still required before deploying to production, pushing, merging, or releasing.

## Known Remaining Work

- Expand automated tests around server actions with a real Supabase/Postgres test environment.
- Complete mobile/browser QA with a real seeded workflow.
