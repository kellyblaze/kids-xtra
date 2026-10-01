"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { AVATAR_OPTIONS, COLOR_THEMES } from "@/lib/constants";

async function getParentFamilyId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", userId)
    .single();
  return data?.family_id ?? null;
}

export async function createChildProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const familyId = await getParentFamilyId(supabase, user.id);
  if (!familyId) return { error: "Family not found" };

  const name = String(formData.get("name") ?? "").trim();
  const nickname = String(formData.get("nickname") ?? "").trim();
  const requestedAvatar = String(formData.get("avatar_key") ?? "star");
  const requestedColor = String(formData.get("color_theme") ?? "purple");
  const avatar = AVATAR_OPTIONS.some((option) => option.key === requestedAvatar)
    ? requestedAvatar
    : "star";
  const color = COLOR_THEMES.some((option) => option.value === requestedColor)
    ? requestedColor
    : "purple";
  if (!name || name.length > 60 || nickname.length > 60)
    return { error: "Please enter a valid name" };

  const { data: child, error } = await supabase
    .from("child_profiles")
    .insert({
      family_id: familyId,
      name,
      nickname: nickname || null,
      avatar_key: avatar,
      color_theme: color,
    })
    .select("id, name, avatar_key")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/parent/children");
  revalidatePath("/parent/dashboard");
  return { success: true, child };
}

export async function updateChildProfile(childId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const familyId = await getParentFamilyId(supabase, user.id);
  if (!familyId) return { error: "Family not found" };

  const { error } = await supabase
    .from("child_profiles")
    .update({
      name: formData.get("name") as string,
      nickname: (formData.get("nickname") as string) || null,
      avatar_key: (formData.get("avatar_key") as string) || "star",
      color_theme: (formData.get("color_theme") as string) || "purple",
    })
    .eq("id", childId)
    .eq("family_id", familyId);

  if (error) return { error: error.message };

  revalidatePath("/parent/children");
  revalidatePath(`/parent/children/${childId}`);
  revalidatePath("/parent/dashboard");
  return { success: true };
}

export async function deleteChildProfile(childId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const familyId = await getParentFamilyId(supabase, user.id);
  if (!familyId) return { error: "Family not found" };

  // Soft delete to preserve credit/chore history
  const { error } = await supabase
    .from("child_profiles")
    .update({ is_active: false })
    .eq("id", childId)
    .eq("family_id", familyId);

  if (error) return { error: error.message };

  revalidatePath("/parent/children");
  revalidatePath("/parent/dashboard");
  return { success: true };
}
