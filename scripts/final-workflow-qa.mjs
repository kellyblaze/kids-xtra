import { readFileSync } from "node:fs";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

loadEnvLocal();

function must(value, message) {
  if (!value) throw new Error(message);
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadEnvLocal() {
  try {
    const env = readFileSync(".env.local", "utf8");
    for (const line of env.split(/\r?\n/)) {
      const match = line.match(/^\s*([^#][^=]+)=(.*)$/);
      if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim();
      }
    }
  } catch {
    // CI can provide env vars directly.
  }
}

async function cleanupRun(admin, ids) {
  if (ids.familyId) {
    await admin.from("families").delete().eq("id", ids.familyId);
  }
  if (ids.parentUserId) {
    await admin.auth.admin.deleteUser(ids.parentUserId);
  }
}

async function main() {
  const keepData = process.argv.includes("--keep");
  const url = must(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL is missing");
  const key = must(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY is missing");
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const ids = {};
  const checkpoints = [];
  const pass = (name, detail = "") => checkpoints.push({ name, detail });

  try {
    const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    const runId = crypto.randomUUID();
    const email = `qa+${stamp}-${runId.slice(0, 8)}@kidsxtra.test`;
    const password = crypto.randomBytes(18).toString("base64url");
    const familyName = `QA Test Family ${stamp}`;
    const familyCode = `QA${stamp.slice(-4)}`;

    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { qa_run_id: runId },
    });
    if (userError) throw userError;
    ids.parentUserId = userData.user.id;

    const { data: family, error: familyError } = await admin
      .from("families")
      .insert({
        name: familyName,
        family_code: familyCode,
        subscription_status: "active",
        settings: { qa: true, qa_run_id: runId },
      })
      .select("id, name")
      .single();
    if (familyError) throw familyError;
    ids.familyId = family.id;

    const { error: parentError } = await admin.from("parent_profiles").insert({
      id: ids.parentUserId,
      family_id: family.id,
      role: "primary_parent",
      display_name: "QA Parent",
    });
    if (parentError) throw parentError;

    await admin.from("family_settings").upsert({
      family_id: family.id,
      allow_negative_balance: false,
    });

    const { data: child, error: childError } = await admin
      .from("child_profiles")
      .insert({
        family_id: family.id,
        name: "Jayden QA",
        nickname: "Jayden",
        avatar_key: "star",
        color_theme: "purple",
      })
      .select("id, name")
      .single();
    if (childError) throw childError;
    pass("Parent adds child", `${child.name} created`);

    const { data: reward, error: rewardError } = await admin
      .from("rewards")
      .insert({
        family_id: family.id,
        title: "LEGO Set QA Reward",
        description: "Disposable QA reward for workflow verification",
        credit_cost: 30,
        category: "Games & Toys",
        created_by: ids.parentUserId,
      })
      .select("id, title, credit_cost")
      .single();
    if (rewardError) throw rewardError;

    const { error: goalError } = await admin.from("child_goals").upsert({
      child_id: child.id,
      family_id: family.id,
      reward_id: reward.id,
    });
    if (goalError) throw goalError;

    const { data: mission, error: missionError } = await admin
      .from("chores")
      .insert({
        family_id: family.id,
        title: "Room Reset",
        description: "Make your bed, put clothes away, put toys away, and clear the floor.",
        category: "chore",
        frequency: "daily",
        times_per_period: 1,
        period_unit: "day",
        credit_value: 30,
        xp_value: 15,
        requires_photo: true,
        checklist_items: ["Make your bed", "Put clothes away", "Put toys away", "Clear the floor"],
        created_by: ids.parentUserId,
      })
      .select("id, title, credit_value, xp_value, checklist_items, requires_photo")
      .single();
    if (missionError) throw missionError;
    pass("Parent creates Room Reset", "+30 Credits, +15 XP, checklist, photo required");

    const { data: assignment, error: assignmentError } = await admin
      .from("chore_assignments")
      .insert({
        chore_id: mission.id,
        child_id: child.id,
        family_id: family.id,
        assigned_by: ids.parentUserId,
      })
      .select("id")
      .single();
    if (assignmentError) throw assignmentError;

    const { data: visibleMission, error: visibleError } = await admin
      .from("chore_assignments")
      .select("id, chores(title, credit_value, xp_value, requires_photo, checklist_items)")
      .eq("id", assignment.id)
      .eq("child_id", child.id)
      .single();
    if (visibleError) throw visibleError;
    const visibleChore = Array.isArray(visibleMission.chores)
      ? visibleMission.chores[0]
      : visibleMission.chores;
    assert(visibleChore.title === "Room Reset", "Child should see Room Reset");
    pass("Child sees Mission", `${visibleChore.title} visible with ${visibleChore.checklist_items.length} checklist items`);

    const firstCompletion = await insertCompletion(admin, family.id, child.id, assignment.id, mission.id);
    pass("Child completes checklist and uploads photo", `${firstCompletion.id} pending approval`);

    const { data: parentCheck, error: parentCheckError } = await admin
      .from("chore_completions")
      .select("id, status, photo_url, checklist_completed")
      .eq("id", firstCompletion.id)
      .single();
    if (parentCheckError) throw parentCheckError;
    assert(parentCheck.status === "pending_approval", "Parent should see pending Mission Check");
    pass("Parent receives Mission Check", "Pending Mission Check includes checklist and photo path");

    const fixNote = "Put the shoes in the closet too.";
    const { error: needsWorkError } = await admin
      .from("chore_completions")
      .update({
        status: "needs_more_work",
        reviewed_at: new Date().toISOString(),
        reviewed_by: ids.parentUserId,
        rejection_note: fixNote,
      })
      .eq("id", firstCompletion.id)
      .eq("family_id", family.id);
    if (needsWorkError) throw needsWorkError;
    pass("Needs More Work returns to child", fixNote);

    const finalCompletion = await insertCompletion(admin, family.id, child.id, assignment.id, mission.id);
    pass("Child resubmits Mission", `${finalCompletion.id} pending approval`);

    await approveMission(admin, {
      familyId: family.id,
      childId: child.id,
      parentUserId: ids.parentUserId,
      completionId: finalCompletion.id,
    });
    pass("Parent approves Mission", "Credits, XP, balance, and streak RPCs executed");

    const { data: afterApproval, error: afterApprovalError } = await admin
      .from("child_profiles")
      .select("credit_balance, xp_total, level")
      .eq("id", child.id)
      .single();
    if (afterApprovalError) throw afterApprovalError;
    assert(afterApproval.credit_balance === 30, `Expected 30 Credits, got ${afterApproval.credit_balance}`);
    assert(afterApproval.xp_total === 15, `Expected 15 XP, got ${afterApproval.xp_total}`);
    pass("Child receives 30 Credits + XP", `${afterApproval.credit_balance} Credits, ${afterApproval.xp_total} XP`);

    const { data: ledgerRows, error: ledgerError } = await admin
      .from("credit_transactions")
      .select("type, amount, note")
      .eq("child_id", child.id)
      .order("created_at");
    if (ledgerError) throw ledgerError;
    assert(ledgerRows.some((row) => row.type === "chore_approved" && row.amount === 30), "Ledger missing mission credit");
    pass("Credits appear in ledger", ledgerRows.map((row) => `${row.type}:${row.amount}`).join(", "));

    const goalProgress = Math.round((afterApproval.credit_balance / reward.credit_cost) * 100);
    assert(goalProgress >= 100, "Savings goal should be reached");
    pass("Child sees progress toward savings goal", `${reward.title}: ${goalProgress}%`);

    const { data: redemption, error: redemptionError } = await admin
      .from("reward_redemptions")
      .insert({
        family_id: family.id,
        child_id: child.id,
        reward_id: reward.id,
        credits_spent: reward.credit_cost,
        status: "requested",
      })
      .select("id, status, credits_spent")
      .single();
    if (redemptionError) throw redemptionError;
    pass("Child redeems reward", `${reward.title} requested for ${redemption.credits_spent} Credits`);

    const { data: approveRewardResult, error: approveRewardError } = await admin.rpc("approve_reward_redemption", {
      p_redemption_id: redemption.id,
      p_family_id: family.id,
      p_reviewed_by: ids.parentUserId,
    });
    if (approveRewardError) throw approveRewardError;
    assert(approveRewardResult?.success === true, `Reward approval failed: ${JSON.stringify(approveRewardResult)}`);

    const { error: fulfillError } = await admin
      .from("reward_redemptions")
      .update({
        status: "fulfilled",
        reviewed_at: new Date().toISOString(),
        reviewed_by: ids.parentUserId,
      })
      .eq("id", redemption.id)
      .eq("family_id", family.id);
    if (fulfillError) throw fulfillError;

    const [{ data: finalChild }, { data: finalRedemption }, { data: finalLedger }] = await Promise.all([
      admin.from("child_profiles").select("credit_balance, xp_total, level").eq("id", child.id).single(),
      admin.from("reward_redemptions").select("status").eq("id", redemption.id).single(),
      admin.from("credit_transactions").select("type, amount, note").eq("child_id", child.id).order("created_at"),
    ]);
    assert(finalRedemption.status === "fulfilled", "Reward should be fulfilled");
    assert(finalChild.credit_balance === 0, `Expected 0 Credits after redemption, got ${finalChild.credit_balance}`);
    assert(finalLedger.some((row) => row.type === "reward_redeemed" && row.amount === -30), "Ledger missing reward debit");
    pass("Parent fulfills reward", `Reward status ${finalRedemption.status}; final balance ${finalChild.credit_balance}`);

    console.log(JSON.stringify({
      ok: true,
      qaRunId: runId,
      cleanedUp: !keepData,
      checkpoints,
      final: {
        childBalance: finalChild.credit_balance,
        xpTotal: finalChild.xp_total,
        level: finalChild.level,
        rewardStatus: finalRedemption.status,
        ledger: finalLedger,
      },
    }, null, 2));
  } finally {
    if (!keepData) await cleanupRun(admin, ids);
  }
}

async function insertCompletion(admin, familyId, childId, assignmentId, missionId) {
  const photoPath = `${familyId}/${childId}/${crypto.randomUUID()}.jpg`;
  const { data, error } = await admin
    .from("chore_completions")
    .insert({
      assignment_id: assignmentId,
      chore_id: missionId,
      child_id: childId,
      family_id: familyId,
      status: "pending_approval",
      photo_url: photoPath,
      checklist_completed: ["Make your bed", "Put clothes away", "Put toys away", "Clear the floor"],
    })
    .select("id, status")
    .single();
  if (error) throw error;
  return data;
}

async function approveMission(admin, { familyId, childId, parentUserId, completionId }) {
  const { error: approveError } = await admin
    .from("chore_completions")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: parentUserId,
      credits_awarded: 30,
      xp_awarded: 15,
    })
    .eq("id", completionId)
    .eq("family_id", familyId);
  if (approveError) throw approveError;

  const { error: creditError } = await admin.from("credit_transactions").insert({
    family_id: familyId,
    child_id: childId,
    type: "chore_approved",
    amount: 30,
    reference_id: completionId,
    note: "Earned for: Room Reset",
    created_by: parentUserId,
  });
  if (creditError) throw creditError;

  const results = await Promise.all([
    admin.rpc("recalculate_child_balance", { p_child_id: childId }),
    admin.rpc("award_xp", { p_child_id: childId, p_xp: 15 }),
    admin.rpc("update_child_streak", { p_child_id: childId }),
  ]);
  for (const result of results) {
    if (result.error) throw result.error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
