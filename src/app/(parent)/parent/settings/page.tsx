export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FamilySettingsForm } from "@/components/parent/FamilySettingsForm";
import { ExportActivityForm } from "@/components/parent/ExportActivityForm";
import { openBillingPortal } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { HelpAndFaq } from "@/components/parent/HelpAndFaq";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id, display_name")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const { data: family } = await supabase
    .from("families")
    .select(
      "id, name, family_code, subscription_status, trial_ends_at, cancel_at_period_end, stripe_customer_id",
    )
    .eq("id", profile.family_id)
    .single();

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your family account
        </p>
      </div>

      <FamilySettingsForm
        familyId={profile.family_id}
        familyName={family?.name ?? ""}
        displayName={profile.display_name ?? ""}
        email={user.email ?? ""}
        familyCode={family?.family_code ?? ""}
      />

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Guided family setup</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Reopen the wizard to add starter missions, rewards, install the app,
          or review Kid Mode.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/parent/onboarding">
            <Sparkles className="size-4" /> Open setup wizard
          </Link>
        </Button>
      </section>

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Billing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Plan status:{" "}
          <span className="font-medium capitalize text-foreground">
            {family?.subscription_status ?? "active"}
          </span>
          {family?.trial_ends_at &&
            ` · Trial ends ${new Date(family.trial_ends_at).toLocaleDateString()}`}
          {family?.cancel_at_period_end &&
            " · Cancels at the end of the billing period"}
        </p>
        {family?.stripe_customer_id && (
          <form action={openBillingPortal} className="mt-4">
            <Button type="submit" variant="outline">
              Manage subscription
            </Button>
          </form>
        )}
      </section>

      <ExportActivityForm />

      <HelpAndFaq accountEmail={user.email ?? ""} />
    </div>
  );
}
