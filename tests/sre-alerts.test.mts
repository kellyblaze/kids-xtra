import test from "node:test";
import assert from "node:assert/strict";
import { sendAlert } from "../src/lib/alerts.ts";
import type { AlertPayload } from "../src/lib/alerts.ts";

const base: AlertPayload = {
  severity: "P0",
  title: "Auth service down",
  service: "auth",
  summary: "Login endpoint returning 503.",
  firstSeen: "2026-11-21T10:00:00Z",
  latestSeen: "2026-11-21T10:05:00Z",
  count: 10,
  fingerprint: "auth-503",
};

test("sendAlert sends email when RESEND_API_KEY and ALERT_EMAIL are set", async () => {
  const calls: { url: string; body: unknown }[] = [];
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.ALERT_EMAIL = "ops@example.com";
  delete process.env.GITHUB_TOKEN;

  globalThis.fetch = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(init?.body as string) });
    return { ok: true, status: 200, text: async () => "" } as Response;
  };

  await sendAlert(base);

  const emailCall = calls.find((c) => c.url.includes("resend.com"));
  assert.ok(emailCall, "should call Resend API");
  const body = emailCall!.body as Record<string, unknown>;
  assert.equal(body.to, "ops@example.com");
  assert.ok((body.subject as string).includes("P0"));
  assert.ok((body.subject as string).includes("auth"));

  delete process.env.RESEND_API_KEY;
  delete process.env.ALERT_EMAIL;
});

test("sendAlert skips email when RESEND_API_KEY is missing", async () => {
  const calls: string[] = [];
  delete process.env.RESEND_API_KEY;
  process.env.ALERT_EMAIL = "ops@example.com";
  delete process.env.GITHUB_TOKEN;

  globalThis.fetch = async (url: string | URL | Request) => {
    calls.push(String(url));
    return { ok: true, status: 200, text: async () => "" } as Response;
  };

  await sendAlert(base);
  assert.ok(!calls.some((u) => u.includes("resend.com")));

  delete process.env.ALERT_EMAIL;
});

test("sendAlert creates GitHub issue when GITHUB_TOKEN and GITHUB_ALERT_REPO are set", async () => {
  const calls: { url: string; body: unknown }[] = [];
  delete process.env.RESEND_API_KEY;
  process.env.GITHUB_TOKEN = "ghp_test";
  process.env.GITHUB_ALERT_REPO = "owner/repo";

  globalThis.fetch = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(init?.body as string) });
    return { ok: true, status: 201, text: async () => "" } as Response;
  };

  await sendAlert(base);

  const ghCall = calls.find((c) => c.url.includes("api.github.com"));
  assert.ok(ghCall, "should call GitHub API");
  const body = ghCall!.body as Record<string, unknown>;
  assert.ok((body.title as string).includes("P0"));
  assert.ok((body.labels as string[]).includes("incident"));
  assert.ok((body.labels as string[]).includes("p0"));

  delete process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_ALERT_REPO;
});

test("sendAlert skips GitHub when GITHUB_TOKEN is missing", async () => {
  const calls: string[] = [];
  delete process.env.RESEND_API_KEY;
  delete process.env.GITHUB_TOKEN;
  process.env.GITHUB_ALERT_REPO = "owner/repo";

  globalThis.fetch = async (url: string | URL | Request) => {
    calls.push(String(url));
    return { ok: true, status: 200, text: async () => "" } as Response;
  };

  await sendAlert(base);
  assert.ok(!calls.some((u) => u.includes("api.github.com")));

  delete process.env.GITHUB_ALERT_REPO;
});

test("sendAlert does not throw when both channels fail", async () => {
  process.env.RESEND_API_KEY = "re_test";
  process.env.ALERT_EMAIL = "ops@example.com";
  process.env.GITHUB_TOKEN = "ghp_test";
  process.env.GITHUB_ALERT_REPO = "owner/repo";

  globalThis.fetch = async () => {
    throw new Error("network down");
  };

  await assert.doesNotReject(() => sendAlert(base));

  delete process.env.RESEND_API_KEY;
  delete process.env.ALERT_EMAIL;
  delete process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_ALERT_REPO;
});

test("sendAlert email HTML escapes < and & in summary", async () => {
  const calls: { url: string; body: unknown }[] = [];
  process.env.RESEND_API_KEY = "re_test";
  process.env.ALERT_EMAIL = "ops@example.com";
  delete process.env.GITHUB_TOKEN;

  globalThis.fetch = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(init?.body as string) });
    return { ok: true, status: 200, text: async () => "" } as Response;
  };

  await sendAlert({ ...base, summary: "<script>alert('xss')</script> & boom" });

  const emailCall = calls.find((c) => c.url.includes("resend.com"));
  const html = (emailCall!.body as Record<string, unknown>).html as string;
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("&amp;"));

  delete process.env.RESEND_API_KEY;
  delete process.env.ALERT_EMAIL;
});
