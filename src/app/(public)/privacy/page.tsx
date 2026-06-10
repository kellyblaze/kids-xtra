export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="text-muted-foreground mt-2">Last updated: June 2025</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Overview</h2>
        <p className="text-muted-foreground leading-relaxed">
          Kids Xtra is a family chore and reward app. We take the privacy of children seriously and
          comply with applicable children&apos;s privacy laws including COPPA. This policy explains
          what data we collect, how we use it, and the controls parents have.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. Children&apos;s Privacy</h2>
        <p className="text-muted-foreground leading-relaxed">
          Children under 13 do not create accounts or provide personal information directly.
          All child profiles are created and managed by a parent or guardian. Children are
          identified by a name, avatar, and color chosen by the parent — no email address,
          phone number, or other personal identifier is collected from or assigned to a child.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. Data We Collect</h2>
        <ul className="list-disc list-inside text-muted-foreground space-y-1">
          <li>Parent account: email address and optional display name</li>
          <li>Family name chosen by the parent</li>
          <li>Child profiles: first name, avatar, color theme (no contact info)</li>
          <li>Chores, rewards, credit transactions, and completion history</li>
          <li>Optional photos of completed chores (stored securely, visible only to the family)</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. How We Use Your Data</h2>
        <p className="text-muted-foreground leading-relaxed">
          Data is used solely to provide the Kids Xtra service — tracking chores, credits, and
          rewards within your family. We do not sell data, share it with third-party advertisers,
          or use it for profiling. AI features, if enabled, process only the minimum data needed
          and never make disciplinary, medical, or legal decisions.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">5. Parental Controls</h2>
        <p className="text-muted-foreground leading-relaxed">
          Parents can view, edit, or delete any child profile, chore, reward, or activity record
          at any time from the parent dashboard. To delete your entire account and all associated
          data, contact us at{" "}
          <a href="mailto:support@kidsxtra.app" className="text-primary underline underline-offset-2">
            support@kidsxtra.app
          </a>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">6. Security</h2>
        <p className="text-muted-foreground leading-relaxed">
          All data is stored in Supabase with row-level security ensuring families can only access
          their own data. Connections are encrypted in transit via HTTPS.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">7. Contact</h2>
        <p className="text-muted-foreground leading-relaxed">
          Questions about this policy?{" "}
          <a href="mailto:support@kidsxtra.app" className="text-primary underline underline-offset-2">
            support@kidsxtra.app
          </a>
        </p>
      </section>
    </div>
  )
}
