import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig, authOptions, staffEnabled } from "@/lib/staff/config";

export async function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const csp = [
    "default-src 'none'",
    `script-src 'self' 'nonce-${nonce}'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
  const forwarded = new Headers(request.headers);
  forwarded.set("Content-Security-Policy", csp);
  function pass() {
    const response = NextResponse.next({ request: { headers: forwarded } });
    response.headers.set("Content-Security-Policy", csp);
    response.headers.set(
      "Cache-Control",
      "private, no-store, max-age=0, must-revalidate",
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  }
  let response = pass();
  if (!staffEnabled()) return response;
  const { url, key, secure } = authConfig();
  const client = createServerClient(url, key, {
    cookieOptions: authOptions(secure),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, authHeaders) {
        for (const { name, value } of values) request.cookies.set(name, value);
        forwarded.set("cookie", request.cookies.toString());
        response = pass();
        for (const { name, value, options } of values)
          response.cookies.set(name, value, options);
        for (const [name, value] of Object.entries(authHeaders))
          response.headers.set(name, value);
      },
    },
  });
  await client.auth.getClaims();
  return response;
}
export const config = { matcher: ["/staff/:path*"] };
