import "server-only"
import type { AlertPayload } from "@/lib/alerts"

// Produces a sanitized incident briefing safe to send to an LLM.
// Never includes child PII, user IDs, or raw stack traces.
export function formatIncidentBriefing(payload: AlertPayload): string {
  const lines = [
    `# Incident Briefing`,
    ``,
    `**Severity:** ${payload.severity}`,
    `**Service:** ${payload.service}`,
    `**Title:** ${payload.title}`,
    `**First seen:** ${payload.firstSeen}`,
    `**Latest:** ${payload.latestSeen}`,
    `**Occurrences:** ${payload.count}`,
    `**Fingerprint:** ${payload.fingerprint}`,
    ``,
    `## Summary`,
    sanitize(payload.summary),
    ``,
  ]

  if (payload.remediationHint) {
    lines.push(`## Suggested remediation`, sanitize(payload.remediationHint), ``)
  }

  lines.push(
    `## Constraints`,
    `- Do not suggest changes that expose child PII`,
    `- Do not suggest disabling authentication or RLS`,
    `- Propose a minimal code diff; output a branch name and PR title`,
    ``,
    `## Task`,
    `Analyze this incident and produce:`,
    `1. Root cause hypothesis (1-2 sentences)`,
    `2. Suggested fix (pseudocode or file + line)`,
    `3. Recommended branch name (e.g. fix/sre-${payload.fingerprint.replace(/[^a-z0-9]/gi, "-").toLowerCase()})`,
    `4. PR title`,
  )

  return lines.join("\n")
}

// Strip potential PII patterns: emails, UUIDs, numeric IDs longer than 6 digits
function sanitize(text: string): string {
  return text
    .replace(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, "[email]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[uuid]")
    .replace(/\b\d{7,}\b/g, "[id]")
}
