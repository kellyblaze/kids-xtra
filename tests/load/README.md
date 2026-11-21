# KidsXtra Load Tests (k6)

> **WARNING — STAGING ONLY**  
> NEVER run these tests against production without explicit written authorization from the system owner.  
> Always use an isolated staging database with synthetic accounts.

---

## Prerequisites

### Install k6

```bash
# macOS
brew install k6

# Windows (Chocolatey)
choco install k6

# Linux
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Docker
docker pull grafana/k6
```

---

## Environment Variables

Set these before running any test. All credentials must be for synthetic staging accounts — never use real user data.

| Variable | Required | Description |
|----------|----------|-------------|
| `K6_BASE_URL` | Yes | Staging base URL, e.g. `https://staging.kidsxtra.cc` |
| `K6_PARENT_EMAIL` | Yes | Synthetic parent account email |
| `K6_PARENT_PASSWORD` | Yes | Synthetic parent account password |
| `K6_KID_FAMILY_CODE` | Yes (kid tests) | Staging family code |
| `K6_KID_CHILD_ID` | Yes (kid tests) | UUID of synthetic child profile |
| `K6_KID_PIN` | Yes (kid tests) | 4-digit PIN for the synthetic child |
| `K6_ASSIGNMENT_ID` | Yes (chore tests) | UUID of a repeatable test assignment |

```bash
export K6_BASE_URL=https://staging.kidsxtra.cc
export K6_PARENT_EMAIL=loadtest@staging.kidsxtra.cc
export K6_PARENT_PASSWORD=StagingOnly!2024
export K6_KID_FAMILY_CODE=TEST01
export K6_KID_CHILD_ID=00000000-0000-0000-0000-000000000001
export K6_KID_PIN=1234
export K6_ASSIGNMENT_ID=00000000-0000-0000-0000-000000000002
```

---

## Running Tests

From the `tests/load/` directory:

```bash
# Smoke — 1 VU, 1 iteration, quick sanity check
npm run test:smoke

# Load — parent login + dashboard, up to 100 VUs
npm run test:load

# Kid flow — kid login + missions, up to 50 VUs
k6 run scenarios/03-kid-flow.js

# Chore submission — up to 50 VUs
k6 run scenarios/04-chore-submission.js

# Stress — 250 VUs, mixed family activity
npm run test:stress

# Spike — burst to 500 VUs
npm run test:spike

# Soak — 25 VUs for 30 minutes
npm run test:soak
```

Or using Docker:

```bash
docker run --rm -e K6_BASE_URL=$K6_BASE_URL grafana/k6 run - < scenarios/01-smoke.js
```

---

## Acceptance Criteria

| Metric | Threshold |
|--------|-----------|
| HTTP error rate | < 1% |
| API p95 response time | < 1,000 ms |
| 5xx responses | 0 |
| Duplicate credit transactions | 0 |
| Cross-family data leakage | 0 |

---

## Test Scenarios

### 01 — Smoke
**Purpose:** Quick sanity check after each deployment.  
**VUs:** 1, **Duration:** ~10 seconds  
**Flow:** Homepage → Login page → Parent auth → Dashboard

### 02 — Parent Login & Dashboard
**Purpose:** Baseline load on the most common parent flow.  
**VUs:** 1 → 100 → 1 over 5 minutes  
**Flow:** Login → Dashboard → Approvals → Logout

### 03 — Kid Flow
**Purpose:** Validate kid-session auth and mission list under load.  
**VUs:** 1 → 50 → 1 over 3 minutes  
**Flow:** Kid login (family code + PIN) → Missions list → Dashboard

### 04 — Chore Submission
**Purpose:** Stress the chore-completion write path and credit calculation RPCs.  
**VUs:** 1 → 50 → 1 over 3 minutes  
**Flow:** Parent login → Submit completion (unique per VU iteration)

### 05 — Concurrent Families
**Purpose:** Simulate realistic multi-family mixed load.  
**VUs:** 1 → 250 → 1 over 10 minutes  
**Mix:** 60% reads, 30% approvals, 10% reward redemptions

### 06 — Spike
**Purpose:** Verify the system recovers from sudden traffic bursts.  
**VUs:** 0 → 500 in 30 s, hold 1 min, ramp down  
**Flow:** Public pages only (homepage, login)

### 07 — Soak
**Purpose:** Detect memory leaks and gradual latency degradation.  
**VUs:** 25 sustained for 30 minutes  
**Flow:** Parent login + dashboard cycle with periodic sleeps

---

## Interpreting Results

k6 prints a summary after each run. Look for:

- `http_req_failed` — should be `< 1%`
- `http_req_duration{p(95)}` — should be `< 1000ms`
- `checks` — all named checks should pass 100%
- `iterations` — higher is better for throughput characterisation

Export metrics to Grafana Cloud or a local InfluxDB + Grafana stack:

```bash
k6 run --out influxdb=http://localhost:8086/k6 scenarios/02-parent-login.js
```
