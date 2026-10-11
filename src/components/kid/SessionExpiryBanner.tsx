import { cookies } from "next/headers";
import { KID_SESSION_COOKIE } from "@/lib/kid-session-constants";
import { KID_SESSION_WARN_SECONDS } from "@/lib/kid-session-constants";
import { getKidSessionExpiry } from "@/lib/kid-session";

export async function SessionExpiryBanner() {
  const cookieStore = await cookies();
  const token = cookieStore.get(KID_SESSION_COOKIE)?.value;
  if (!token) return null;

  const expiresAt = await getKidSessionExpiry(token);
  if (!expiresAt) return null;

  const secsRemaining = expiresAt - Math.floor(new Date().getTime() / 1000);
  if (secsRemaining > KID_SESSION_WARN_SECONDS) return null;

  const hoursLeft = Math.max(0, Math.floor(secsRemaining / 3600));

  return (
    <div className="mx-4 mt-3 rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-2.5 flex items-center gap-2 text-sm font-bold text-amber-800">
      <span>⏳</span>
      <span>
        {hoursLeft > 0
          ? `Your login expires in about ${hoursLeft}h — ask a parent to log you back in soon.`
          : "Your login is expiring very soon — ask a parent to log you back in."}
      </span>
    </div>
  );
}
