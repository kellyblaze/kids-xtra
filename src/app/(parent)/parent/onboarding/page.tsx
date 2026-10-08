export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/parent/OnboardingWizard";
import { parseOnboardingState } from "@/lib/onboarding";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/setup");

  const [
    { data: family },
    { data: children },
    { count: choreCount },
    { count: rewardCount },
  ] = await Promise.all([
    supabase
      .from("families")
      .select("name, family_code, settings, subscription_status")
      .eq("id", profile.family_id)
      .single(),
    supabase
      .from("child_profiles")
      .select("id, name, avatar_key, pin_hash")
      .eq("family_id", profile.family_id)
      .eq("is_active", true)
      .order("created_at"),
    supabase
      .from("chores")
      .select("id", { count: "exact", head: true })
      .eq("family_id", profile.family_id)
      .eq("is_active", true),
    supabase
      .from("rewards")
      .select("id", { count: "exact", head: true })
      .eq("family_id", profile.family_id)
      .eq("is_active", true),
  ]);
  if (!family) redirect("/setup");
  const onboarding = parseOnboardingState(family.settings);

  return (
    <OnboardingWizard
      familyName={family.name}
      familyCode={family.family_code ?? ""}
      subscriptionStatus={family.subscription_status ?? "active"}
      initialStep={onboarding.completed ? 0 : onboarding.step}
      initialPreferences={onboarding.preferences}
      initialChildren={(children ?? []).map((child) => ({
        ...child,
        hasPin: Boolean(child.pin_hash),
      }))}
      initialChoreCount={choreCount ?? 0}
      initialRewardCount={rewardCount ?? 0}
    />
  );
}
