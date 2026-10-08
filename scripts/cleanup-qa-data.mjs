import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

loadEnvLocal();

function loadEnvLocal() {
  try {
    const env = readFileSync(".env.local", "utf8");
    for (const line of env.split(/\r?\n/)) {
      const match = line.match(/^\s*([^#][^=]+)=(.*)$/);
      if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim();
      }
    }
  } catch {
    // CI can provide env vars directly.
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars are missing");

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: families, error: familyError } = await admin
    .from("families")
    .select("id, name")
    .ilike("name", "QA Test Family%");
  if (familyError) throw familyError;

  for (const family of families ?? []) {
    const { error } = await admin.from("families").delete().eq("id", family.id);
    if (error) throw error;
  }

  let page = 1;
  const deletedUsers = [];
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const users = data.users ?? [];
    for (const user of users) {
      const email = user.email ?? "";
      const isQaUser =
        (email.startsWith("qa+") && email.endsWith("@kidsxtra.test")) ||
        typeof user.user_metadata?.qa_run_id === "string";
      if (isQaUser) {
        const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
        if (deleteError) throw deleteError;
        deletedUsers.push(email || user.id);
      }
    }
    if (users.length < 1000) break;
    page += 1;
  }

  console.log(JSON.stringify({
    ok: true,
    deletedFamilies: (families ?? []).map((family) => family.name),
    deletedUsers,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
