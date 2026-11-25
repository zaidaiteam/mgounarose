import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { authConfig, authOptions, staffEnabled } from "./config";

const setupCookie = "rose-staff-password-flow";
const tokenIdentity = z.object({ sub: z.uuid(), session_id: z.uuid() });
export type Session = { user: string; session: string };
export type PasswordFlow = "invite" | "recovery";

export async function staffAuth() {
  const jar = await cookies();
  const { url, key, secure } = authConfig();
  return createServerClient(url, key, {
    cookieOptions: authOptions(secure),
    cookies: {
      getAll: () => jar.getAll(),
      setAll(values) {
        try {
          for (const { name, value, options } of values)
            jar.set(name, value, options);
        } catch {
          /* Server Components cannot write cookies. The proxy handles refresh. */
        }
      },
    },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

export async function verifiedSession(
  client?: Awaited<ReturnType<typeof staffAuth>>,
): Promise<Session | null> {
  if (!staffEnabled()) return null;
  const auth = client ?? (await staffAuth());
  const { data, error } = await auth.auth.getClaims();
  const claims = tokenIdentity.safeParse(data?.claims);
  if (error || !claims.success) return null;
  // The DB repository also checks auth.sessions and the employee row on every call.
  return { user: claims.data.sub, session: claims.data.session_id };
}

export async function requireOrigin() {
  const req = await headers();
  const origin = authConfig().origin;
  const fetchSite = req.get("sec-fetch-site");
  return (
    req.get("origin") === origin && (!fetchSite || fetchSite === "same-origin")
  );
}

function signature(value: string) {
  const secret = z.string().min(43).parse(process.env.ROSE_FLOW_SECRET);
  return createHmac("sha256", secret).update(value).digest("base64url");
}
export async function setPasswordFlow(session: Session, flow: PasswordFlow) {
  const value = [
    flow,
    session.user,
    session.session,
    Date.now() + 15 * 60 * 1000,
  ].join(".");
  const jar = await cookies();
  jar.set(setupCookie, value + "." + signature(value), {
    httpOnly: true,
    sameSite: "strict",
    secure: authConfig().secure,
    path: "/staff",
    maxAge: 900,
  });
}
export async function passwordFlow(
  session: Session,
): Promise<PasswordFlow | null> {
  const value = (await cookies()).get(setupCookie)?.value;
  if (!value || value.length > 180) return null;
  const [flow, user, id, expires, provided, extra] = value.split(".");
  if (
    extra !== undefined ||
    (flow !== "invite" && flow !== "recovery") ||
    !provided ||
    user !== session.user ||
    id !== session.session ||
    !/^\d{13}$/.test(expires) ||
    Number(expires) <= Date.now()
  )
    return null;
  const expected = Buffer.from(signature([flow, user, id, expires].join(".")));
  const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual)
    ? flow
    : null;
}
export async function clearPasswordFlow() {
  (await cookies()).set(setupCookie, "", {
    path: "/staff",
    maxAge: 0,
    httpOnly: true,
    sameSite: "strict",
    secure: authConfig().secure,
  });
}
