# KidsXtra Earning System Tests

## Verification Performed

Run from `C:\Users\info\Kids Xtra\kids-xtra`:

```powershell
npm run lint
npm run build
```

Results: both commands passed on 2026-10-06.

Additional command:

```powershell
npm test
```

Result: passed on 2026-10-06.

## Required Test Coverage

The repository currently has no obvious dedicated test script in `package.json`. Add focused tests before shipping database or authorization changes.

Priority cases:

- Mission completion creates a pending completion for the authorized child.
- Mission requiring photo rejects completion without a valid family/child photo path.
- Parent Mission Check approval awards Credits once and records a ledger row.
- Needs More Work stores parent feedback without awarding Credits.
- Bonus Credits require an authorized parent, positive amount, and reason.
- Reward redemption requires enough Credits.
- Reward approval debits Credits through the ledger and recalculates balance.
- Spend-vs-save prompt appears when a child has a different active goal.
- Savings goal progress handles zero or low balances.
- XP and level update after Mission approval.
- Streak updates after approval without removing previous Credits.
- Child cannot complete or redeem for another child.
- Parent cannot mutate another family.
- Xtra Coach plan validation rejects malformed or age-inappropriate output.
- Xtra Coach generated missions are not created until the parent clicks Add or Add Entire Plan.

## Manual Product Test

Use a seeded family and verify:

1. Parent adds child.
2. Parent creates `Room Reset` with 30 Credits, XP, checklist-style description, and optional Mission Photo.
3. Child sees it under Missions.
4. Child completes it and uploads photo if required.
5. Parent sees it under Mission Checks.
6. Parent chooses Needs More Work and child sees the note.
7. Child resubmits.
8. Parent approves.
9. Child receives Credits and XP.
10. Credit history shows the earned transaction.
11. Child sets a reward as My Goal and sees progress.
12. Child tries a smaller reward and sees spend-vs-save awareness.
13. Child redeems a reward after reaching cost.
14. Parent approves and fulfills the reward.
