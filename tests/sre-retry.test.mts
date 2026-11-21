import test from "node:test";
import assert from "node:assert/strict";
import { withRetry } from "../src/lib/retry.ts";

test("withRetry returns immediately on success", async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls++;
    return "ok";
  });
  assert.equal(result, "ok");
  assert.equal(calls, 1);
});

test("withRetry retries on retryable error then succeeds", async () => {
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls++;
      if (calls < 3) throw new Error("network error");
      return "recovered";
    },
    { baseDelayMs: 0, maxDelayMs: 0 },
  );
  assert.equal(result, "recovered");
  assert.equal(calls, 3);
});

test("withRetry throws after maxAttempts exhausted", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      withRetry(
        async () => {
          calls++;
          throw new Error("timeout");
        },
        { maxAttempts: 2, baseDelayMs: 0 },
      ),
    /timeout/,
  );
  assert.equal(calls, 2);
});

test("withRetry does not retry non-retryable errors", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      withRetry(
        async () => {
          calls++;
          throw new Error("validation failed");
        },
        { baseDelayMs: 0 },
      ),
    /validation failed/,
  );
  assert.equal(calls, 1);
});

test("withRetry respects custom shouldRetry predicate", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      withRetry(
        async () => {
          calls++;
          throw new Error("custom error");
        },
        {
          baseDelayMs: 0,
          maxAttempts: 5,
          shouldRetry: () => false,
        },
      ),
    /custom error/,
  );
  assert.equal(calls, 1);
});

test("withRetry retries on 5xx status code in error message", async () => {
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls++;
      if (calls < 2) throw new Error("received 503 from upstream");
      return "done";
    },
    { baseDelayMs: 0 },
  );
  assert.equal(result, "done");
  assert.equal(calls, 2);
});

test("withRetry does not retry 4xx status codes", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      withRetry(
        async () => {
          calls++;
          throw new Error("received 404 not found");
        },
        { baseDelayMs: 0 },
      ),
    /404/,
  );
  assert.equal(calls, 1);
});
