import "server-only";
import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export function authorizeCronRequest(
  request: NextRequest,
): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "Cron is not configured" },
      { status: 503 },
    );
  const actual = new TextEncoder().encode(
    request.headers.get("authorization") ?? "",
  );
  const expected = new TextEncoder().encode(`Bearer ${secret}`);
  const authorized =
    actual.length === expected.length && timingSafeEqual(actual, expected);
  return authorized
    ? null
    : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
