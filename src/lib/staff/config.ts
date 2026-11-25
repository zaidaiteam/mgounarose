import "server-only";
import { z } from "zod";

export const staffEnabled = () => process.env.ROSE_STAFF_ENABLED === "true";

export function authConfig() {
  const url = z.url().parse(process.env.SUPABASE_URL);
  const origin = new URL(z.url().parse(process.env.ROSE_APP_ORIGIN)).origin;
  const appUrl = new URL(origin);
  const authUrl = new URL(url);
  const local = (hostname: string) =>
    ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
  if (
    (appUrl.protocol !== "https:" &&
      !(appUrl.protocol === "http:" && local(appUrl.hostname))) ||
    (authUrl.protocol !== "https:" &&
      !(authUrl.protocol === "http:" && local(authUrl.hostname)))
  ) {
    throw new Error("Staff Auth requires HTTPS outside loopback");
  }
  const key = z.string().min(20).parse(process.env.SUPABASE_PUBLISHABLE_KEY);
  // Legacy anon keys work with local Supabase. Never accept a service-role key here.
  if (!key.startsWith("sb_publishable_")) {
    const payload = key.split(".")[1];
    if (
      !payload ||
      JSON.parse(Buffer.from(payload, "base64url").toString()).role !== "anon"
    ) {
      throw new Error("Staff Auth requires a publishable or local anon key");
    }
  }
  return { url, key, origin, secure: appUrl.protocol === "https:" };
}

const sessionCookie = "sb-rose-staff-auth";
export function authOptions(secure: boolean) {
  return {
    name: sessionCookie,
    path: "/staff",
    sameSite: "lax" as const,
    httpOnly: true,
    secure,
  };
}
