# KidsXtra Load Test Plan

**Tool:** Grafana k6 (OSS)  
**Tests location:** `tests/load/`  
**Last updated:** 2026-11-21

> ⚠️ **NEVER run load tests against production without explicit written authorization.**  
> All tests must target an isolated staging environment with synthetic accounts.

---

## 1. Installation

```bash
# macOS
brew install k6

# Windows (Chocolatey)
choco install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

Verify: `k6 version`

---

## 2. Environment Variables

Set these before running any test. **Do not commit real credentials.**

| Variable | Description | Required |
|---|---|---|
| `K6_BASE_URL` | Staging app URL (e.g. `https://staging.kidsxtra.cc`) | Yes |
| `K6_PARENT_EMAIL` | Synthetic parent account email | Yes |
| `K6_PARENT_PASSWORD` | Synthetic parent account password | Yes |
| `K6_KID_FAMILY_CODE` | Synthetic family code (4-char uppercase) | Yes |
| `K6_KID_CHILD_ID` | UUID of synthetic child profile | Yes |
| `K6_KID_PIN` | 4-digit PIN for synthetic child | Yes |

Export them before running:

```bash
export K6_BASE_URL=https://staging.kidsxtra.cc
export K6_PARENT_EMAIL=load-test@example.com
export K6_PARENT_PASSWORD=SyntheticPass123!
export K6_KID_FAMILY_CODE=TEST
export K6_KID_CHILD_ID=00000000-0000-0000-0000-000000000001
export K6_KID_PIN=1234
```

---

## 3. Acceptance Criteria

All scenarios must pass these thresholds to be considered healthy:

| Metric | Threshold |
|---|---|
| HTTP error rate (`http_req_failed`) | < 1% |
| API p95 response time | < 1,000 ms |
| p99 response time | < 2,000 ms |
| No duplicate transactions | Verified via `x-idempotency-key` checks |
| No cross-family data leakage | Each VU uses isolated synthetic family |

---

## 4. Scenarios

### 01-smoke.js — Smoke Test
**Purpose:** Verify the app is up and basic routes respond before heavier tests.  
**Load:** 1 VU, 1 iteration.  
**What a VU does:**
1. `GET /` — homepage
2. `GET /login` — login page
3. `POST` parent login (Supabase auth)
4. `GET /parent/dashboard`
5. Assert all responses are HTTP 200

```bash
k6 run tests/load/scenarios/01-smoke.js
```

---

### 02-parent-login.js — Parent Login + Dashboard Load
**Purpose:** Measure login latency and dashboard load under realistic concurrent parent sessions.  
**Load:** Ramps 1 → 25 → 50 → 100 → 50 → 1 VUs over 5 minutes.  
**What a VU does:**
1. Login with synthetic parent credentials
2. `GET /parent/dashboard`
3. `GET /parent/approvals`
4. Session logout
5. Sleep 1–3s between iterations

```bash
k6 run tests/load/scenarios/02-parent-login.js
```

---

### 03-kid-flow.js — Kid Family-Code Login + Mission List
**Purpose:** Measure kid authentication latency and mission page load.  
**Load:** Ramps 1 → 25 → 50 → 25 → 1 VUs over 3 minutes.  
**What a VU does:**
1. `POST /api/kid/login` with `{ familyCode, childId, pin }`
2. Assert session cookie present in response
3. `GET /kid/{childId}/missions`
4. `GET /kid/{childId}/dashboard`

```bash
k6 run tests/load/scenarios/03-kid-flow.js
```

---

### 04-chore-submission.js — Chore Completion Write Path
**Purpose:** Verify write path performance; check for duplicate submissions.  
**Load:** Ramps 1 → 25 → 50 → 25 → 1 VUs over 3 minutes.  
**What a VU does:**
1. Login as parent
2. Submit a chore completion with a unique idempotency key per VU iteration
3. Track a custom counter for any duplicate-submission responses (HTTP 409)
4. Assert duplicate counter stays at 0

```bash
k6 run tests/load/scenarios/04-chore-submission.js
```

---

### 05-concurrent-families.js — Mixed Load / Stress Test
**Purpose:** Simulate realistic concurrent family activity; verify no cross-family data leakage.  
**Load:** Ramps 1 → 50 → 100 → 250 → 100 → 1 VUs over 10 minutes.  
**Traffic mix:**
- 60% read: parent dashboard, kid missions list
- 30% write: chore approval, reward approval
- 10% redemption: reward request

**Cross-family check:** Each VU asserts that responses contain only its own synthetic family's data (checks `family_id` in JSON where available).

```bash
k6 run tests/load/scenarios/05-concurrent-families.js
```

---

### 06-spike.js — Spike Test
**Purpose:** Verify the app survives a sudden burst and recovers gracefully.  
**Load:** 1 → 500 VUs in 30 seconds, hold 1 minute, ramp down to 1 in 30 seconds.  
**What a VU does:** `GET /` and `GET /login` only (read-only, no auth).  
**Recovery check:** After spike ends, error rate must return to < 1% within 2 minutes.

```bash
k6 run tests/load/scenarios/06-spike.js
```

---

### 07-soak.js — Soak Test
**Purpose:** Detect memory leaks or latency degradation over sustained load.  
**Load:** 25 VUs for 30 minutes (constant).  
**What a VU does:** Parent login → dashboard cycle with 2–5s think time.  
**Analysis:** Compare p95 latency in the first 5 minutes vs last 5 minutes. A > 20% increase indicates potential leak or degradation.

```bash
k6 run tests/load/scenarios/07-soak.js
```

---

## 5. Progressive Load Schedule

Run in this order on a fresh staging environment:

```
smoke → parent-login → kid-flow → chore-submission → concurrent-families → spike → soak
```

Do not run spike or soak tests on the same day as a production deployment.

---

## 6. npm Scripts

From `tests/load/`:

```bash
npm run test:smoke    # 01-smoke.js
npm run test:load     # 02-parent-login.js
npm run test:stress   # 05-concurrent-families.js
npm run test:spike    # 06-spike.js
npm run test:soak     # 07-soak.js
```

---

## 7. k6 Cloud (Optional)

k6 OSS runs locally and is free. For distributed load from multiple regions, use k6 Cloud:

- Free tier: 50 VUh/month
- Paid: starts at ~$49/month for 500 VUh

To use k6 Cloud, set `K6_CLOUD_TOKEN` and run with `k6 cloud <scenario>`.  
The `tests/load/k6.config.json` stub contains the project configuration.

---

## 8. Maximum Tested Sustainable Load

*To be filled in after first full test run on staging.*

| Scenario | Max VUs Tested | p95 at Max | Error Rate |
|---|---|---|---|
| Parent login | — | — | — |
| Kid flow | — | — | — |
| Concurrent families | — | — | — |
| Spike | — | — | — |
