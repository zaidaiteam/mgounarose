"use server";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { authConfig, staffEnabled } from "@/lib/staff/config";
import {
  clearPasswordFlow,
  passwordFlow,
  requireOrigin,
  setPasswordFlow,
  staffAuth,
  verifiedSession,
} from "@/lib/staff/auth";
import { staffRepository } from "@/lib/staff/repository";
import {
  fictionalEmail,
  newPassword,
  parseCommand,
  tokenHash,
} from "@/lib/staff/validation";

async function assertAction() {
  if (!staffEnabled()) notFound();
  if (!(await requireOrigin())) redirect("/staff/login?notice=origin");
}

export async function signIn(form: FormData) {
  await assertAction();
  const email = fictionalEmail.safeParse(form.get("email"));
  const password = z.string().min(1).max(128).safeParse(form.get("password"));
  if (!email.success || !password.success)
    redirect("/staff/login?notice=credentials");
  const auth = await staffAuth();
  await clearPasswordFlow();
  const { error } = await auth.auth.signInWithPassword({
    email: email.data,
    password: password.data,
  });
  if (error) redirect("/staff/login?notice=credentials");
  const session = await verifiedSession(auth);
  const actor =
    session && (await staffRepository.actor(session).catch(() => null));
  if (!actor) {
    await auth.auth.signOut({ scope: "local" });
    redirect("/staff/login?notice=credentials");
  }
  redirect("/staff/workspace");
}

export async function requestReset(form: FormData) {
  await assertAction();
  const email = fictionalEmail.safeParse(form.get("email"));
  if (email.success) {
    try {
      await (
        await staffAuth()
      ).auth.resetPasswordForEmail(email.data, {
        redirectTo: authConfig().origin + "/staff/callback",
      });
    } catch {
      /* Use the same response regardless of account or mail delivery status. */
    }
  }
  redirect("/staff/reset?notice=requested");
}

export async function verifyToken(form: FormData) {
  await assertAction();
  const token = tokenHash.safeParse(form.get("token_hash"));
  const flow = z.enum(["invite", "recovery"]).safeParse(form.get("type"));
  if (!token.success || !flow.success) redirect("/staff/login?notice=link");
  const auth = await staffAuth();
  const { error } = await auth.auth.verifyOtp({
    token_hash: token.data,
    type: flow.data,
  });
  const session = !error && (await verifiedSession(auth));
  if (!session) redirect("/staff/login?notice=link");
  if (
    flow.data === "recovery" &&
    !(await staffRepository.actor(session).catch(() => null))
  ) {
    await auth.auth.signOut({ scope: "local" });
    redirect("/staff/login?notice=link");
  }
  await setPasswordFlow(session, flow.data);
  redirect("/staff/password");
}

export async function savePassword(form: FormData) {
  await assertAction();
  const auth = await staffAuth();
  const session = await verifiedSession(auth);
  const flow = session && (await passwordFlow(session));
  if (!session || !flow) redirect("/staff/login?notice=link");
  const password = newPassword.safeParse(form.get("password"));
  if (!password.success) redirect("/staff/password?notice=password");
  if (
    flow === "recovery" &&
    !(await staffRepository.actor(session).catch(() => null))
  ) {
    await auth.auth.signOut({ scope: "local" });
    await clearPasswordFlow();
    redirect("/staff/login?notice=link");
  }
  const { error } = await auth.auth.updateUser({ password: password.data });
  if (error) redirect("/staff/password?notice=password");
  if (flow === "invite" && !(await staffRepository.redeem(session))) {
    await auth.auth.signOut({ scope: "local" });
    await clearPasswordFlow();
    redirect("/staff/login?notice=link");
  }
  await clearPasswordFlow();
  // Revoke other sessions after a password change. The current verified session survives.
  const revoked = await auth.auth.signOut({ scope: "others" });
  if (revoked.error) {
    await auth.auth.signOut({ scope: "local" });
    redirect("/staff/login?notice=password_saved");
  }
  redirect("/staff/workspace");
}

export async function signOut() {
  await assertAction();
  const auth = await staffAuth();
  const { error } = await auth.auth.signOut({ scope: "local" });
  await clearPasswordFlow();
  if (error) {
    // Supabase clears sessions on success. On transient failure, expire HttpOnly cookies locally.
    const { cookies } = await import("next/headers");
    const jar = await cookies();
    for (const cookie of jar.getAll())
      if (/^sb-rose-staff-auth(?:\.\d+)?$/.test(cookie.name)) {
        jar.set(cookie.name, "", {
          path: "/staff",
          maxAge: 0,
          httpOnly: true,
          sameSite: "lax",
          secure: authConfig().secure,
        });
      }
  }
  redirect("/staff/login?notice=signed_out");
}

const sections = [
  "overview",
  "orders",
  "customers",
  "catalog",
  "messages",
  "guides",
  "faq",
  "tasks",
  "employees",
  "performance",
  "audit",
] as const;
export async function mutateStaff(form: FormData) {
  await assertAction();
  const session = await verifiedSession();
  if (!session || (await passwordFlow(session))) redirect("/staff/login");
  const section = z.enum(sections).safeParse(form.get("return_to"));
  const command = parseCommand(form);
  const result = command
    ? await staffRepository.command(session, command)
    : "invalid";
  redirect(
    "/staff/workspace?section=" +
      (section.success ? section.data : "overview") +
      "&notice=" +
      result,
  );
}
