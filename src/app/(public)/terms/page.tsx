export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="text-muted-foreground mt-2">Last updated: June 2025</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Acceptance</h2>
        <p className="text-muted-foreground leading-relaxed">
          By creating an account you agree to these Terms. If you are setting up an account
          on behalf of children in your household, you confirm you are their parent or legal guardian.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. Service Description</h2>
        <p className="text-muted-foreground leading-relaxed">
          Kids Xtra is a household chore management and reward tracking tool for families. It is not
          a financial product. Credits are virtual points with no monetary value.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. Parent Responsibilities</h2>
        <ul className="list-disc list-inside text-muted-foreground space-y-1">
          <li>You are responsible for all activity under your account</li>
          <li>You must supervise your children&apos;s use of the app</li>
          <li>You control all chores, rewards, approvals, and child profile data</li>
          <li>You must not share your login credentials with your children</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. Acceptable Use</h2>
        <p className="text-muted-foreground leading-relaxed">
          You agree not to use Kids Xtra for any unlawful purpose, to harm minors, to attempt to
          bypass security controls, or to interfere with other users&apos; access to the service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">5. AI Features</h2>
        <p className="text-muted-foreground leading-relaxed">
          AI-generated suggestions (where available) are for convenience only. Kids Xtra AI will
          never make disciplinary, medical, mental health, or legal decisions. Parents are always
          the final decision-makers.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">6. Disclaimers</h2>
        <p className="text-muted-foreground leading-relaxed">
          Kids Xtra is provided &quot;as is&quot; without warranties of any kind. We are not liable for
          any indirect, incidental, or consequential damages arising from use of the service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">7. Changes</h2>
        <p className="text-muted-foreground leading-relaxed">
          We may update these Terms at any time. Continued use of the service after changes
          are posted constitutes acceptance of the new Terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">8. Contact</h2>
        <p className="text-muted-foreground leading-relaxed">
          <a href="mailto:support@kidsxtra.app" className="text-primary underline underline-offset-2">
            support@kidsxtra.app
          </a>
        </p>
      </section>
    </div>
  )
}
