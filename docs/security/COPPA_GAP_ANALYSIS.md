# KidsXtra COPPA Gap Analysis

**Date:** 2026-11-20
**Standard:** Children's Online Privacy Protection Act (COPPA), 16 C.F.R. Part 312
**Review scope:** Source-code and configuration only. This is NOT a legal compliance certification. Engage legal counsel before making compliance claims.

---

## Applicability

KidsXtra is an application directed at children under 13 and their parents. As a "website or online service directed to children" that collects personal information from children, it is subject to COPPA requirements regardless of whether it currently serves US-based users.

---

## Requirement-by-Requirement Analysis

### 312.3 — General Requirement: Verifiable Parental Consent

| Item | Status | Evidence |
|------|--------|----------|
| Notice to parents before collecting child data | GAP | No separate parental notice flow found |
| Verifiable parental consent mechanism | GAP | signUp creates family and immediately allows child creation; no consent gate |
| Age gate at sign-up | GAP | No date-of-birth or age-confirmation UI found |

**Detail:** The signUp server action (src/app/actions/auth.ts) creates a Supabase Auth user and a families row in a single flow with no COPPA-specific consent. COPPA requires that an operator obtain verifiable parental consent before collecting, using, or disclosing personal information from children under 13.

**Acceptable consent methods (FTC Rule):** credit card transaction, toll-free telephone number with trained personnel, video conference with trained personnel, or government-issued ID check. Email + toggle checkbox is NOT sufficient as "verifiable" consent.

---

### 312.4 — Notice to Parents (Privacy Policy)

| Item | Status | Evidence |
|------|--------|----------|
| Privacy policy posted on website | GAP | No /privacy route found in app |
| Privacy policy linked from home page | GAP | No footer links found |
| Privacy policy describes data collected | GAP | Policy does not exist |
| Privacy policy describes use and disclosure | GAP | Policy does not exist |
| Privacy policy describes parent rights | GAP | Policy does not exist |
| Privacy policy linked from sign-up | GAP | No link at sign-up |

**Required disclosures:** The policy must list each category of personal information collected, the specific purpose of each collection, whether the information is disclosed to third parties (Anthropic Claude API, Resend, Stripe, Supabase/Postgres), and how parents can review/delete their child's information.

---

### 312.5 — Verifiable Parental Consent (Methods)

| Item | Status |
|------|--------|
| Consent mechanism implemented | GAP |
| Consent is verifiable (not just checkbox) | GAP |
| Consent stored with timestamp and method | GAP |
| Consent revocable by parent | GAP |

---

### 312.6 — Right to Review Personal Information

| Item | Status | Evidence |
|------|--------|----------|
| Parent can review child's personal information | PARTIAL | Parents have full dashboard access to child data |
| Mechanism to request deletion | GAP | deleteChildProfile exists but soft-deletes only; no hard-delete, no documented process |
| Parent can refuse further collection | GAP | No opt-out mechanism found |
| Response timeframe defined | GAP | No process documented |

---

### 312.7 — Conditioning Participation on Disclosure

**Status: PASS** - Children can use the app (complete chores, earn credits) without disclosing more personal information than necessary. No "provide more data to unlock features" pattern found.

---

### 312.8 — Confidentiality, Security, and Integrity

| Item | Status | Evidence |
|------|--------|----------|
| Reasonable security procedures | PASS | Argon2id PIN hashing, HMAC sessions, RLS on all tables |
| Data integrity measures | PASS | Parameterized queries, SECURITY DEFINER RPCs |
| Access limited to authorized persons | PASS | Service-role key server-only, RLS enforces family isolation |
| Confidential treatment of data | GAP | No documented data handling policy for employees/vendors |

---

### 312.10 — Data Retention and Deletion

| Item | Status | Evidence |
|------|--------|----------|
| Data retained only as long as necessary | GAP | No retention schedule found |
| Deletion procedure defined | GAP | Soft-delete only; no hard-delete cron job |
| Photos deleted when child deleted | GAP | deleteChildProfile sets is_active=false; no storage bucket cleanup |
| Activity logs purged | GAP | activity_logs table has no TTL or deletion job |

---

## Third-Party Data Disclosures

COPPA requires disclosing all third parties that receive children's personal information.

| Third Party | Data Shared | Disclosed |
|-------------|-------------|-----------|
| Supabase (database host) | All child profile data, activity logs | NOT in policy |
| Anthropic Claude API | Child age (integer), parent-typed goal text, chore titles | NOT in policy |
| Resend (email) | Parent email, child names (in weekly report HTML) | NOT in policy |
| Stripe | Parent billing information only (no child data) | NOT in policy |
| Vercel (hosting) | All traffic, IP addresses | NOT in policy |

**Notable:** The weekly report email (send-weekly-report/route.ts) embeds child names in the HTML body sent to Resend's API. This constitutes disclosure of children's personal information to a third party and must be disclosed in the privacy policy.

---

## Data Inventory (Personal Information Collected from Children)

| Category | Fields | Sensitivity |
|----------|--------|-------------|
| Identity | name, nickname | Medium |
| Account | pin_hash | High |
| Behavioral | activity_logs, chore_completions, child_streaks, mission_progress | Medium |
| Financial | credit_transactions, credit_balance, reward_redemptions | Low (virtual currency) |
| Photos | Chore photos (may incidentally include child's image) | High |
| Inferred | level, xp_total, child_badges | Low |

---

## Gap Summary

| Gap | Severity | COPPA Section |
|-----|----------|--------------|
| No verifiable parental consent mechanism | CRITICAL | 312.5 |
| No privacy policy | CRITICAL | 312.4 |
| No data retention/deletion schedule | HIGH | 312.10 |
| Child names sent to Resend (undisclosed 3rd party) | HIGH | 312.4 |
| No hard-delete for child data | HIGH | 312.10 |
| No parental opt-out mechanism | MEDIUM | 312.6 |
| No consent stored/auditable | MEDIUM | 312.5 |
| Photo deletion on child removal not implemented | MEDIUM | 312.10 |
| No third-party disclosure list in policy | HIGH | 312.4 |

---

## Recommendations (Priority Order)

1. **Engage legal counsel** - COPPA compliance requires a Privacy Policy drafted by an attorney familiar with FTC COPPA enforcement.
2. **Publish a Privacy Policy** - minimum viable content: data collected, purpose, third parties, retention period, parent rights, contact information.
3. **Implement verifiable consent** - consider a credit card micro-transaction, government ID check service (e.g., Persona, Veriff), or FTC-approved alternative. A checkbox does not qualify.
4. **Build hard-delete** - create a Vercel cron job or on-demand parent-initiated flow that permanently deletes: child_profiles, activity_logs, chore_completions, credit_transactions, child_badges, and chore photos in Supabase storage.
5. **Strip child names from Resend payloads** - replace child names in email HTML with initials or "your child" for the Resend transmission.
6. **Store consent record** - add a parental_consents table recording consent method, timestamp, IP hash, and version of Privacy Policy accepted.
