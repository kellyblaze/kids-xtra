export const dynamic = "force-dynamic";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  HardDrive,
  KeyRound,
  Radio,
  ShieldCheck,
  WalletCards,
  XCircle,
} from "lucide-react";
import type React from "react";
import { createAdminClient } from "@/lib/supabase/admin";

type Status = "ok" | "warn" | "error";

type CountCheck = {
  label: string;
  value: number | null;
  status: Status;
  detail?: string;
};

type EnvCheck = {
  label: string;
  configured: boolean;
  required: boolean;
};

type ChildBalanceRow = {
  id: string;
  name: string | null;
  credit_balance: number | null;
};

type CreditTransactionRow = {
  child_id: string | null;
  amount: number | null;
};

type StaleItem = {
  id: string;
  created_at?: string | null;
  completed_at?: string | null;
  requested_at?: string | null;
  child_profiles?: { name?: string | null } | { name?: string | null }[] | null;
};

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "KID_SESSION_SECRET",
  "CRON_SECRET",
  "ADMIN_HEALTH_PASSWORD",
] as const;

const OPTIONAL_ENV = [
  "ADMIN_HEALTH_USERNAME",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID",
  "RESEND_API_KEY",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_EMAIL",
  "ANTHROPIC_API_KEY",
] as const;

export default async function AdminHealthPage() {
  const checkedAt = new Date();
  const admin = createAdminClient();
  const databaseCheck = await checkDatabaseLatency(admin);

  const [
    counts,
    staleMissionChecks,
    staleRewardRequests,
    balanceCheck,
    recentActivity,
  ] = await Promise.all([
    getCounts(admin),
    getStaleMissionChecks(admin),
    getStaleRewardRequests(admin),
    getBalanceIntegrity(admin),
    getRecentActivityCount(admin),
  ]);

  const envChecks = getEnvChecks();
  const requiredMissing = envChecks.filter(
    (check) => check.required && !check.configured,
  );
  const warningCount =
    counts.filter((count) => count.status === "warn").length +
    (staleMissionChecks.length > 0 ? 1 : 0) +
    (staleRewardRequests.length > 0 ? 1 : 0) +
    (balanceCheck.mismatches.length > 0 ? 1 : 0) +
    requiredMissing.length;
  const errorCount =
    counts.filter((count) => count.status === "error").length +
    (databaseCheck.status === "error" ? 1 : 0);
  const overallStatus: Status =
    errorCount > 0 ? "error" : warningCount > 0 ? "warn" : "ok";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl">
          <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="p-6 md:p-8">
              <StatusPill status={overallStatus} />
              <h1 className="mt-5 text-3xl font-black tracking-tight md:text-5xl">
                Kids Xtra Health
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-300">
                Read-only operational snapshot for the app, database, workflow
                queues, integrations, and data integrity checks.
              </p>
            </div>
            <div className="border-t border-white/10 bg-slate-900 p-6 lg:border-l lg:border-t-0 md:p-8">
              <div className="grid gap-4">
                <SummaryRow label="Checked" value={checkedAt.toLocaleString()} />
                <SummaryRow
                  label="Commit"
                  value={process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local"}
                />
                <SummaryRow
                  label="Environment"
                  value={process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown"}
                />
                <SummaryRow
                  label="Warnings"
                  value={String(warningCount)}
                  tone={warningCount > 0 ? "warn" : "ok"}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <HealthCard
            title="App"
            status={overallStatus}
            icon={Radio}
            value={overallStatus === "ok" ? "Healthy" : "Needs review"}
            detail="Aggregated health from all checks below."
          />
          <HealthCard
            title="Database"
            status={databaseCheck.status}
            icon={Database}
            value={
              databaseCheck.latencyMs == null
                ? "Unavailable"
                : `${databaseCheck.latencyMs}ms`
            }
            detail={databaseCheck.detail}
          />
          <HealthCard
            title="Environment"
            status={requiredMissing.length ? "warn" : "ok"}
            icon={KeyRound}
            value={
              requiredMissing.length
                ? `${requiredMissing.length} missing`
                : "Configured"
            }
            detail="Required secrets are checked by presence only."
          />
          <HealthCard
            title="Data Integrity"
            status={balanceCheck.mismatches.length ? "warn" : "ok"}
            icon={WalletCards}
            value={
              balanceCheck.mismatches.length
                ? `${balanceCheck.mismatches.length} mismatch`
                : "Clean sample"
            }
            detail={balanceCheck.detail}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <Panel title="Core Counts" icon={HardDrive}>
            <div className="grid gap-3 sm:grid-cols-2">
              {counts.map((count) => (
                <CountTile key={count.label} check={count} />
              ))}
            </div>
          </Panel>

          <Panel title="Workflow Queues" icon={Clock3}>
            <div className="space-y-4">
              <QueueBlock
                title="Mission Checks older than 48h"
                items={staleMissionChecks}
                empty="No stale Mission Checks."
              />
              <QueueBlock
                title="Reward requests older than 48h"
                items={staleRewardRequests}
                empty="No stale reward requests."
              />
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-black text-white">
                  Activity in last 24h
                </p>
                <p className="mt-2 text-3xl font-black text-emerald-300">
                  {recentActivity}
                </p>
              </div>
            </div>
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Panel title="Environment Checks" icon={ShieldCheck}>
            <div className="grid gap-2">
              {envChecks.map((check) => (
                <div
                  key={check.label}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-black text-white">{check.label}</p>
                    <p className="text-xs font-bold text-slate-400">
                      {check.required ? "Required" : "Optional"}
                    </p>
                  </div>
                  <StatusDot status={check.configured ? "ok" : check.required ? "warn" : "warn"} />
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Ledger Balance Sample" icon={WalletCards}>
            {balanceCheck.mismatches.length === 0 ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                <p className="font-black text-emerald-200">No mismatches found.</p>
                <p className="mt-1 text-sm font-medium leading-6 text-emerald-100/80">
                  {balanceCheck.detail}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {balanceCheck.mismatches.map((item) => (
                  <div
                    key={item.childId}
                    className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4"
                  >
                    <p className="font-black text-amber-100">{item.childName}</p>
                    <p className="mt-1 text-sm font-medium text-amber-100/80">
                      Stored {item.storedBalance}, ledger {item.ledgerBalance}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </section>
      </div>
    </main>
  );
}

function getEnvChecks(): EnvCheck[] {
  return [
    ...REQUIRED_ENV.map((label) => ({
      label,
      required: true,
      configured: Boolean(process.env[label]),
    })),
    ...OPTIONAL_ENV.map((label) => ({
      label,
      required: false,
      configured: Boolean(process.env[label]),
    })),
  ];
}

async function checkDatabaseLatency(
  admin: ReturnType<typeof createAdminClient>,
): Promise<{ status: Status; latencyMs: number | null; detail: string }> {
  const start = performance.now();
  const { error } = await admin.from("families").select("id").limit(1);
  const latencyMs = Math.round(performance.now() - start);
  if (error) {
    return {
      status: "error",
      latencyMs: null,
      detail: error.message,
    };
  }
  return {
    status: latencyMs > 750 ? "warn" : "ok",
    latencyMs,
    detail: latencyMs > 750 ? "Database response is slower than expected." : "Database query succeeded.",
  };
}

async function getCounts(
  admin: ReturnType<typeof createAdminClient>,
): Promise<CountCheck[]> {
  const fortyEightHoursAgo = new Date(
    Date.now() - 48 * 60 * 60 * 1000,
  ).toISOString();

  const specs = [
    {
      label: "Families",
      run: () => admin.from("families").select("*", { count: "exact", head: true }),
    },
    {
      label: "Active children",
      run: () =>
        admin
          .from("child_profiles")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),
    },
    {
      label: "Active Missions",
      run: () =>
        admin
          .from("chores")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),
    },
    {
      label: "Pending Mission Checks",
      run: () =>
        admin
          .from("chore_completions")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending_approval"),
    },
    {
      label: "Needs More Work",
      run: () =>
        admin
          .from("chore_completions")
          .select("*", { count: "exact", head: true })
          .eq("status", "needs_more_work"),
    },
    {
      label: "Reward requests",
      run: () =>
        admin
          .from("reward_redemptions")
          .select("*", { count: "exact", head: true })
          .eq("status", "requested"),
    },
    {
      label: "Stale Mission Checks",
      run: () =>
        admin
          .from("chore_completions")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending_approval")
          .lt("completed_at", fortyEightHoursAgo),
    },
    {
      label: "Push subscriptions",
      run: () =>
        admin
          .from("push_subscriptions")
          .select("*", { count: "exact", head: true }),
    },
  ] as const;

  const results = await Promise.all(
    specs.map(async (spec) => {
      const { count, error } = await spec.run();
      if (error) {
        return {
          label: spec.label,
          value: null,
          status: "error" as const,
          detail: error.message,
        };
      }
      const value = count ?? 0;
      return {
        label: spec.label,
        value,
        status:
          spec.label.startsWith("Stale") && value > 0
            ? ("warn" as const)
            : ("ok" as const),
      };
    }),
  );

  return results;
}

async function getStaleMissionChecks(
  admin: ReturnType<typeof createAdminClient>,
): Promise<StaleItem[]> {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data } = await admin
    .from("chore_completions")
    .select("id, completed_at, child_profiles(name)")
    .eq("status", "pending_approval")
    .lt("completed_at", cutoff)
    .order("completed_at", { ascending: true })
    .limit(10);
  return (data ?? []) as StaleItem[];
}

async function getStaleRewardRequests(
  admin: ReturnType<typeof createAdminClient>,
): Promise<StaleItem[]> {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data } = await admin
    .from("reward_redemptions")
    .select("id, requested_at, child_profiles(name)")
    .eq("status", "requested")
    .lt("requested_at", cutoff)
    .order("requested_at", { ascending: true })
    .limit(10);
  return (data ?? []) as StaleItem[];
}

async function getRecentActivityCount(
  admin: ReturnType<typeof createAdminClient>,
): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("activity_logs")
    .select("*", { count: "exact", head: true })
    .gte("created_at", cutoff);
  return count ?? 0;
}

async function getBalanceIntegrity(admin: ReturnType<typeof createAdminClient>) {
  const [{ data: children }, { data: transactions }] = await Promise.all([
    admin
      .from("child_profiles")
      .select("id, name, credit_balance")
      .eq("is_active", true)
      .limit(500),
    admin.from("credit_transactions").select("child_id, amount").limit(20000),
  ]);

  const childRows = (children ?? []) as ChildBalanceRow[];
  const transactionRows = (transactions ?? []) as CreditTransactionRow[];
  const ledgerByChild = new Map<string, number>();
  for (const transaction of transactionRows) {
    if (!transaction.child_id) continue;
    ledgerByChild.set(
      transaction.child_id,
      (ledgerByChild.get(transaction.child_id) ?? 0) + (transaction.amount ?? 0),
    );
  }

  const mismatches = childRows
    .map((child) => ({
      childId: child.id,
      childName: child.name ?? "Unnamed child",
      storedBalance: child.credit_balance ?? 0,
      ledgerBalance: ledgerByChild.get(child.id) ?? 0,
    }))
    .filter((item) => item.storedBalance !== item.ledgerBalance)
    .slice(0, 10);

  return {
    mismatches,
    detail: `Checked ${childRows.length} active children and ${transactionRows.length} ledger rows. Limited to first 500 children and 20,000 transactions.`,
  };
}

function HealthCard({
  title,
  status,
  icon: Icon,
  value,
  detail,
}: {
  title: string;
  status: Status;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10 text-slate-100">
          <Icon className="size-5" />
        </div>
        <StatusDot status={status} />
      </div>
      <p className="mt-5 text-sm font-black text-slate-400">{title}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-400">
        {detail}
      </p>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-white/10">
          <Icon className="size-5 text-slate-200" />
        </div>
        <h2 className="text-xl font-black text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function CountTile({ check }: { check: CountCheck }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-black text-slate-300">{check.label}</p>
        <StatusDot status={check.status} />
      </div>
      <p className="mt-3 text-3xl font-black text-white">
        {check.value ?? "Error"}
      </p>
      {check.detail && (
        <p className="mt-2 text-xs font-medium leading-5 text-amber-200">
          {check.detail}
        </p>
      )}
    </div>
  );
}

function QueueBlock({
  title,
  items,
  empty,
}: {
  title: string;
  items: StaleItem[];
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-white">{title}</p>
        <StatusDot status={items.length > 0 ? "warn" : "ok"} />
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-sm font-medium text-slate-400">{empty}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2"
            >
              <p className="text-sm font-black text-amber-100">
                {getChildName(item)}
              </p>
              <p className="text-xs font-medium text-amber-100/75">
                {formatDate(item.completed_at ?? item.requested_at ?? item.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const copy =
    status === "ok"
      ? "All systems normal"
      : status === "warn"
        ? "Review warnings"
        : "Action needed";
  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black ${statusClasses(status)}`}>
      <StatusIcon status={status} />
      {copy}
    </div>
  );
}

function StatusDot({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ${statusClasses(status)}`}>
      <StatusIcon status={status} />
      {status.toUpperCase()}
    </span>
  );
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "ok") return <CheckCircle2 className="size-3.5" />;
  if (status === "warn") return <AlertTriangle className="size-3.5" />;
  return <XCircle className="size-3.5" />;
}

function statusClasses(status: Status): string {
  if (status === "ok") return "bg-emerald-400/15 text-emerald-200";
  if (status === "warn") return "bg-amber-400/15 text-amber-200";
  return "bg-rose-400/15 text-rose-200";
}

function SummaryRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: Status;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
      <p className="text-sm font-bold text-slate-400">{label}</p>
      <p
        className={`text-right text-sm font-black ${
          tone ? statusTextClass(tone) : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function statusTextClass(status: Status): string {
  if (status === "ok") return "text-emerald-200";
  if (status === "warn") return "text-amber-200";
  return "text-rose-200";
}

function getChildName(item: StaleItem): string {
  const child = Array.isArray(item.child_profiles)
    ? item.child_profiles[0]
    : item.child_profiles;
  return child?.name ?? "Unknown child";
}

function formatDate(value?: string | null): string {
  if (!value) return "Unknown date";
  return new Date(value).toLocaleString();
}
