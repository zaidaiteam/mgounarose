// Local-only Auth/Storage fixture. The Next app uses its real SSR client and repository.
import { createServer } from "node:http";
import { createHmac, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const host = "127.0.0.1";
const appOrigin = "http://127.0.0.1:3101";
const fixtureOrigin = "http://127.0.0.1:3102";
const users = [
  "admin",
  "advisor-a",
  "advisor-b",
  "inactive",
  "logistics",
  "preparation",
  "manager",
  "existing",
  "invited",
].map((name, index) => ({
  id: `10000000-0000-4000-8000-00000000000${index + 1}`,
  email: name + "@example.test",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: { provider: "email" },
  user_metadata: { role: "admin" },
  created_at: "2026-01-01T00:00:00Z",
}));
const sessions = new Map();
const usedTokens = new Set();
const passwords = new Map(
  users.map((user) => [user.id, "Fictional-test-password!"]),
);
const db = new PGlite();
for (const file of [
  "./rose-baseline.sql",
  "../../supabase/migrations/20261125133313_rose_staff_v03.sql",
  "./staff-data.sql",
  "../../supabase/fixtures/content.sql",
]) {
  await db.exec(await readFile(new URL(file, import.meta.url), "utf8"));
}
await db.exec("set role rose_care_app");
const wire = new PGLiteSocketServer({
  db,
  port: 3103,
  host,
  maxConnections: 8,
});
await wire.start();
const owner = (callback) =>
  db.transaction(async (tx) => {
    await tx.exec("set local role postgres");
    return callback(tx);
  });
const encode = (value) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");
async function openSession(user) {
  const sessionId = randomUUID();
  await owner((tx) =>
    tx.query("insert into auth.sessions(id,user_id) values($1,$2)", [
      sessionId,
      user.id,
    ]),
  );
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: fixtureOrigin + "/auth/v1",
    sub: user.id,
    session_id: sessionId,
    role: "authenticated",
    aud: "authenticated",
    iat: now,
    exp: now + 3600,
    email: user.email,
    user_metadata: user.user_metadata,
  };
  const jwt = encode({ alg: "HS256", typ: "JWT" }) + "." + encode(payload);
  const access_token =
    jwt +
    "." +
    createHmac("sha256", "fixture-only-signing-material")
      .update(jwt)
      .digest("base64url");
  const refresh_token = randomUUID();
  sessions.set(access_token, { user, sessionId });
  return {
    access_token,
    refresh_token,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    user,
  };
}
function data(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}
async function input(req) {
  let value = "";
  for await (const chunk of req) {
    value += chunk;
    if (value.length > 16000) throw Error("Fixture input too large");
  }
  return value ? JSON.parse(value) : {};
}
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, fixtureOrigin);
    const match = sessions.get(req.headers.authorization?.slice(7));
    if (
      url.pathname === "/auth/v1/token" &&
      url.searchParams.get("grant_type") === "password" &&
      req.method === "POST"
    ) {
      const body = await input(req);
      const user = users.find((item) => item.email === body.email);
      if (!user || passwords.get(user.id) !== body.password)
        return data(res, 400, {
          code: "invalid_credentials",
          message: "Fixture credentials rejected",
        });
      return data(res, 200, await openSession(user));
    }
    if (url.pathname === "/auth/v1/user" && match) {
      if (req.method === "PUT") {
        const body = await input(req);
        if (typeof body.password === "string")
          passwords.set(match.user.id, body.password);
      }
      return data(res, 200, match.user);
    }
    if (url.pathname === "/auth/v1/recover" && req.method === "POST") {
      await input(req);
      return data(res, 200, {});
    }
    if (url.pathname === "/auth/v1/verify" && req.method === "POST") {
      const body = await input(req);
      const user =
        body.type === "invite" && body.token_hash === "controlled-invite-000009"
          ? users[8]
          : body.type === "recovery" &&
              body.token_hash === "controlled-recovery-000003"
            ? users[2]
            : null;
      if (user && !usedTokens.has(body.token_hash)) {
        usedTokens.add(body.token_hash);
        return data(res, 200, await openSession(user));
      }
      return data(res, 400, {
        code: "otp_expired",
        message: "Fixture link unavailable",
      });
    }
    if (url.pathname === "/auth/v1/logout" && match && req.method === "POST") {
      const others = url.searchParams.get("scope") === "others";
      const target = [...sessions].filter(
        ([, item]) =>
          item.user.id === match.user.id &&
          (others
            ? item.sessionId !== match.sessionId
            : item.sessionId === match.sessionId),
      );
      await owner(async (tx) => {
        for (const [token, item] of target) {
          await tx.query("delete from auth.sessions where id=$1", [
            item.sessionId,
          ]);
          sessions.delete(token);
        }
      });
      res.writeHead(204);
      return res.end();
    }
    if (
      url.pathname.startsWith("/storage/v1/object/sign/rose-care-guides/") &&
      req.method === "POST" &&
      match
    ) {
      const body = await input(req);
      const path = url.pathname.split("/rose-care-guides/")[1];
      const visible = await db.transaction(async (tx) => {
        await tx.exec("set local role authenticated");
        await tx.query(
          "select set_config('request.jwt.claim.sub',$1,true), set_config('request.jwt.claims',$2,true)",
          [match.user.id, JSON.stringify({ session_id: match.sessionId })],
        );
        return tx.query("select name from storage.objects where name=$1", [
          path,
        ]);
      });
      if (!visible.rows.length || body.expiresIn !== 60)
        return data(res, 404, { error: "not_found" });
      return data(res, 200, {
        signedURL:
          "/object/sign/rose-care-guides/" +
          path +
          "?token=fictional-signed-guide",
      });
    }
    if (
      url.pathname ===
        "/storage/v1/object/sign/rose-care-guides/fictional/demo.pdf" &&
      url.searchParams.get("token") === "fictional-signed-guide"
    ) {
      res.writeHead(200, {
        "Content-Type": "text/plain",
        "Cache-Control": "no-store",
      });
      return res.end("Guide PDF fictif");
    }
    if (url.pathname === "/_fixture/expire" && req.method === "POST") {
      const body = await input(req);
      const user = users.find((item) => item.email === body.email);
      if (user)
        await owner((tx) =>
          tx.query(
            "update auth.sessions set not_after=now()-interval '1 second' where user_id=$1",
            [user.id],
          ),
        );
      return data(res, 200, {});
    }
    return data(res, 401, {
      code: "session_not_found",
      message: "Fixture session unavailable",
    });
  } catch {
    data(res, 500, { message: "Controlled fixture unavailable" });
  }
});
await new Promise((resolve) => server.listen(3102, host, resolve));
const next = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    host,
    "--port",
    "3101",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      ROSE_STAFF_ENABLED: "true",
      ROSE_APP_ORIGIN: appOrigin,
      SUPABASE_URL: fixtureOrigin,
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fictional_fixture",
      ROSE_FLOW_SECRET:
        "fixture-only-password-flow-secret-more-than-43-characters",
      ROSE_DATABASE_URL:
        "postgres://rose_care_app:fixture@127.0.0.1:3103/postgres",
    },
  },
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  next.kill();
  server.close();
  await wire.stop();
  await db.close();
}
process.on("SIGTERM", () => void stop());
process.on("SIGINT", () => void stop());
next.on("exit", () => void stop());
