import { NextResponse } from "next/server";
import { z } from "zod";
import { authConfig, staffEnabled } from "@/lib/staff/config";
import {
  passwordFlow,
  requireOrigin,
  staffAuth,
  verifiedSession,
} from "@/lib/staff/auth";
import { staffRepository } from "@/lib/staff/repository";

const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
};
const reject = (status: number) =>
  new NextResponse("Guide indisponible.", { status, headers });

async function readGuideId(request: Request) {
  if (
    !request.headers
      .get("content-type")
      ?.startsWith("application/x-www-form-urlencoded") ||
    !request.body
  )
    return null;
  const reader = request.body.getReader();
  const buffer = new Uint8Array(1024);
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (length + value.length > buffer.length) {
        await reader.cancel();
        return null;
      }
      buffer.set(value, length);
      length += value.length;
    }
    const params = new URLSearchParams(
      new TextDecoder().decode(buffer.subarray(0, length)),
    );
    return params.size === 1 ? params.get("guide_id") : null;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  if (!staffEnabled()) return reject(404);
  if (!(await requireOrigin())) return reject(403);
  const auth = await staffAuth();
  const session = await verifiedSession(auth);
  if (!session || (await passwordFlow(session))) return reject(401);
  const id = z.uuid().safeParse(await readGuideId(request));
  if (!id.success) return reject(400);
  const path = await staffRepository.guidePath(session, id.data);
  if (!path) return reject(404);
  const { data: signed, error } = await auth.storage
    .from("rose-care-guides")
    .createSignedUrl(path, 60);
  if (error || !signed?.signedUrl) return reject(404);
  const url = new URL(signed.signedUrl);
  if (
    url.origin !== new URL(authConfig().url).origin ||
    !url.pathname.startsWith("/storage/v1/object/sign/rose-care-guides/")
  )
    return reject(404);
  return NextResponse.redirect(url, { status: 303, headers });
}
