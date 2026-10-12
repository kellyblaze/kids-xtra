import { ExternalLink, LifeBuoy, Mail, MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FAQS, SUPPORT_EMAIL } from "@/lib/faq";

export function HelpAndFaq({ accountEmail }: { accountEmail: string }) {
  const subject = encodeURIComponent("Kids Xtra help request");
  const body = encodeURIComponent(
    `Hi Kids Xtra Support,\n\nI need help with:\n\n\nAccount email: ${accountEmail}\n\nPlease do not include passwords, child PINs, or sensitive family information.`,
  );
  const contactHref = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

  return (
    <section
      aria-labelledby="help-and-faq-heading"
      className="rounded-xl border bg-white p-5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <LifeBuoy className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h2 id="help-and-faq-heading" className="font-semibold">
            Help &amp; FAQ
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Find a quick answer or contact Kids Xtra support.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {FAQS.map(({ question, answer }) => (
          <details
            key={question}
            className="group rounded-xl border border-slate-200 bg-slate-50 open:bg-white"
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3 font-medium text-slate-800 transition-colors hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-600 active:bg-violet-100 [&::-webkit-details-marker]:hidden">
              <MessageCircleQuestion
                className="size-4 shrink-0 text-violet-600"
                aria-hidden="true"
              />
              <span className="flex-1">{question}</span>
              <span
                aria-hidden="true"
                className="text-lg text-slate-400 transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="px-4 pb-4 pl-11 text-sm leading-6 text-slate-600">
              {answer}
            </p>
          </details>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-violet-100 bg-violet-50 p-4">
        <h3 className="font-semibold text-violet-950">Still need help?</h3>
        <p className="mt-1 text-sm leading-6 text-violet-800">
          Email us from your account address when possible. Never send your
          password or a child&apos;s PIN.
        </p>
        <Button asChild className="mt-3">
          <a href={contactHref}>
            <Mail className="size-4" aria-hidden="true" /> Email support
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </Button>
        <p className="mt-2 text-xs font-medium text-violet-700">
          {SUPPORT_EMAIL}
        </p>
      </div>
    </section>
  );
}
