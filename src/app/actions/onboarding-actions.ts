"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CHORE_TEMPLATES } from "@/lib/chore-templates";
import { STARTER_REWARDS, type OnboardingPreferences } from "@/lib/onboarding";
export type { OnboardingPreferences } from "@/lib/onboarding";

async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();
  return profile
    ? { supabase, userId: user.id, familyId: profile.family_id }
    : null;
}

export async function saveOnboardingProgress(
  step: number,
  preferences?: OnboardingPreferences,
  completed = false,
) {
  const ctx = await getContext();
  if (!ctx) return { error: "Not authenticated" };
  if (!Number.isInteger(step) || step < 0 || step > 7)
    return { error: "Invalid setup step" };

  const { data: family } = await ctx.supabase
    .from("families")
    .select("settings")
    .eq("id", ctx.familyId)
    .single();

  const current =
    family?.settings && typeof family.settings === "object"
      ? family.settings
      : {};
  const onboarding = {
    step,
    completed,
    updatedAt: new Date().toISOString(),
    ...(completed ? { completedAt: new Date().toISOString() } : {}),
    ...(preferences ? { preferences } : {}),
  };
  const admin = createAdminClient();
  const { error } = await admin
    .from("families")
    .update({ settings: { ...current, onboarding } })
    .eq("id", ctx.familyId);

  if (error) return { error: "Could not save setup progress" };
  revalidatePath("/parent/dashboard");
  return { success: true };
}

export async function addStarterChores(
  templateIds: string[],
  childIds: string[],
  requirePhoto: boolean,
) {
  const ctx = await getContext();
  if (!ctx) return { error: "Not authenticated" };
  if (
    !Array.isArray(templateIds) ||
    !Array.isArray(childIds) ||
    templateIds.length > 8 ||
    childIds.length > 20
  ) {
    return { error: "Invalid starter selection" };
  }
  const selected = [...new Set(templateIds)]
    .map((id) => CHORE_TEMPLATES.find((item) => item.id === id))
    .filter(Boolean);
  if (!selected.length || selected.length > 8)
    return { error: "Choose between 1 and 8 Missions" };

  const { data: ownedChildren } = await ctx.supabase
    .from("child_profiles")
    .select("id")
    .eq("family_id", ctx.familyId)
    .eq("is_active", true)
    .in("id", [...new Set(childIds)]);
  const safeChildIds = (ownedChildren ?? []).map((child) => child.id);
  if (!safeChildIds.length) return { error: "Add or choose a child first" };

  const { data: existing } = await ctx.supabase
    .from("chores")
    .select("title")
    .eq("family_id", ctx.familyId)
    .in(
      "title",
      selected.map((item) => item!.title),
    );
  const existingTitles = new Set((existing ?? []).map((item) => item.title));
  const rows = selected
    .filter((item) => !existingTitles.has(item!.title))
    .map((item) => ({
      family_id: ctx.familyId,
      title: item!.title,
      description: item!.description,
      category: item!.category,
      frequency: item!.periodUnit === "day" ? "daily" : "weekly",
      times_per_period: item!.timesPerPeriod,
      period_unit: item!.periodUnit,
      credit_value: item!.creditValue,
      xp_value: item!.xpValue,
      requires_photo: requirePhoto === true,
      created_by: ctx.userId,
    }));

  if (!rows.length) return { success: true, created: 0 };
  const { data: chores, error } = await ctx.supabase
    .from("chores")
    .insert(rows)
    .select("id, title");
  if (error || !chores) return { error: "Could not add starter Missions" };
  const assignments = chores.flatMap((chore) =>
    safeChildIds.map((childId) => ({
      chore_id: chore.id,
      child_id: childId,
      family_id: ctx.familyId,
      assigned_by: ctx.userId,
    })),
  );
  const { error: assignmentError } = await ctx.supabase
    .from("chore_assignments")
    .insert(assignments);
  if (assignmentError) {
    await ctx.supabase
      .from("chores")
      .delete()
      .eq("family_id", ctx.familyId)
      .in(
        "id",
        chores.map((chore) => chore.id),
      );
    return { error: "Could not add and assign starter Missions" };
  }
  revalidatePath("/parent/chores");
  revalidatePath("/parent/dashboard");
  return { success: true, created: chores.length };
}

export async function addStarterRewards(templateIds: string[]) {
  const ctx = await getContext();
  if (!ctx) return { error: "Not authenticated" };
  if (!Array.isArray(templateIds) || templateIds.length > 4)
    return { error: "Invalid reward selection" };
  const selected = [...new Set(templateIds)]
    .map((id) => STARTER_REWARDS.find((reward) => reward.id === id))
    .filter(
      (item): item is (typeof STARTER_REWARDS)[number] => item !== undefined,
    );
  if (!selected.length || selected.length > 4)
    return { error: "Choose at least one reward" };
  const { data: existing } = await ctx.supabase
    .from("rewards")
    .select("title")
    .eq("family_id", ctx.familyId);
  const existingTitles = new Set((existing ?? []).map((item) => item.title));
  const rows = selected
    .filter((item) => !existingTitles.has(item.title))
    .map((item) => ({
      family_id: ctx.familyId,
      title: item.title,
      description: item.description,
      credit_cost: item.creditCost,
      category: item.category,
      created_by: ctx.userId,
    }));
  if (rows.length) {
    const { error } = await ctx.supabase.from("rewards").insert(rows);
    if (error) return { error: "Could not add starter rewards" };
  }
  revalidatePath("/parent/rewards");
  revalidatePath("/parent/dashboard");
  return { success: true, created: rows.length };
}
