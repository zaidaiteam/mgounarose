import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

let input = "";
for await (const chunk of process.stdin) input += chunk;
const status = JSON.parse(input);
const authUrl = new URL(status.API_URL);
const dbUrl = new URL(status.DB_URL);
const isLocal = (url) => ["127.0.0.1", "localhost"].includes(url.hostname);
if (
  !isLocal(authUrl) ||
  !isLocal(dbUrl) ||
  authUrl.port !== "54321" ||
  dbUrl.port !== "54322"
)
  throw new Error("Refusing all non-test endpoints");
const secret = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
const publicKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const admin = createClient(authUrl.origin, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const sql = postgres(dbUrl.href, { prepare: false });
const password = randomBytes(24).toString("hex");
const dbPassword = randomBytes(24).toString("hex");
const names = [
  "admin",
  "advisor-a",
  "advisor-b",
  "inactive",
  "logistics",
  "preparation",
  "manager",
  "existing",
];
function checked(result, operation) {
  if (result.error)
    throw Error(
      operation +
        " failed (" +
        (result.error.code ?? result.error.status ?? "provider") +
        ")",
    );
  return result.data;
}
try {
  let data = await readFile(
    new URL("../fixtures/staff-data.sql", import.meta.url),
    "utf8",
  );
  data = data.slice(
    data.indexOf("insert into rose_care.employees"),
    data.indexOf("insert into storage.objects"),
  );
  for (const [index, name] of names.entries()) {
    const created = checked(
      await admin.auth.admin.createUser({
        email: name + "@example.test",
        password,
        email_confirm: true,
        user_metadata: { role: "admin" },
      }),
      "fixture account",
    );
    data = data.replaceAll(
      `10000000-0000-4000-8000-00000000000${index + 1}`,
      created.user.id,
    );
  }
  await sql.unsafe(data).simple();
  await sql
    .unsafe(
      await readFile(
        new URL("../../supabase/fixtures/content.sql", import.meta.url),
        "utf8",
      ),
    )
    .simple();
  await sql
    .unsafe("alter role rose_care_app login password '" + dbPassword + "'")
    .simple();
  checked(
    await admin.storage.createBucket("rose-care-guides", { public: false }),
    "private bucket",
  );
  checked(
    await admin.storage
      .from("rose-care-guides")
      .upload(
        "fictional/demo.pdf",
        Buffer.from("%PDF-1.4\n% Fictional document\n%%EOF\n"),
        { contentType: "application/pdf" },
      ),
    "fixture document",
  );
} finally {
  await sql.end();
}
dbUrl.username = "rose_care_app";
dbUrl.password = dbPassword;
const env = {
  ...process.env,
  ROSE_STAFF_ENABLED: "true",
  ROSE_APP_ORIGIN: "http://127.0.0.1:3101",
  SUPABASE_URL: authUrl.origin,
  SUPABASE_PUBLISHABLE_KEY: publicKey,
  ROSE_DATABASE_URL: dbUrl.href,
  ROSE_FLOW_SECRET: randomBytes(32).toString("hex"),
  ROSE_LOCAL_API_ADMIN: secret,
  ROSE_LOCAL_FIXTURE_PASSWORD: password,
};
const proc = spawn(
  "pnpm",
  ["exec", "playwright", "test", "--config", "playwright.supabase.config.ts"],
  { stdio: "inherit", env },
);
process.exitCode = await new Promise((resolve, reject) => {
  proc.on("error", reject);
  proc.on("exit", (code) => resolve(code ?? 1));
});
