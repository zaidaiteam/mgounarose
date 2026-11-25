import "server-only";
import postgres from "postgres";
import { z } from "zod";
import type { Session } from "./auth";
import { staffEnabled } from "./config";
import type { Command } from "./validation";
import type { Workspace } from "./types";

let pool: ReturnType<typeof postgres> | undefined;
function db() {
  if (!staffEnabled()) throw new Error("Staff workspace is disabled");
  if (pool) return pool;
  const dsn = z.url().parse(process.env.ROSE_DATABASE_URL);
  const url = new URL(dsn);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !/^rose_care_app(?:\.[a-z0-9]+)?$/.test(decodeURIComponent(url.username)) ||
    url.search ||
    url.hash ||
    !url.password
  ) {
    throw new Error(
      "Use the restricted rose_care_app connection with no connection-string options",
    );
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  pool = postgres(dsn, {
    ssl: loopback ? false : { rejectUnauthorized: true },
    prepare: false,
    max: 3,
    idle_timeout: 15,
    connect_timeout: 8,
    max_lifetime: 60 * 5,
    connection: {
      application_name: "rose-care-v03",
      statement_timeout: 8000,
      lock_timeout: 4000,
    },
  });
  return pool;
}

export const actorSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  role: z.enum(["admin", "manager", "advisor", "logistics", "preparation"]),
});
export type Actor = z.infer<typeof actorSchema>;
export function databaseCode(error: unknown) {
  return error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
    ? error.code
    : "";
}

export const staffRepository = {
  async actor(session: Session): Promise<Actor | null> {
    try {
      const [row] =
        await db()`select rose_care.staff_identity(${session.user}::uuid,${session.session}::uuid) as result`;
      return actorSchema.parse(row.result);
    } catch (error) {
      if (databaseCode(error) === "42501") return null;
      throw new Error("Staff identity check unavailable");
    }
  },
  async workspace(session: Session): Promise<Workspace> {
    try {
      const [row] =
        await db()`select rose_care.staff_workspace(${session.user}::uuid,${session.session}::uuid) as result`;
      return row.result as Workspace;
    } catch (error) {
      if (databaseCode(error) === "42501") throw new StaffDenied();
      throw new Error("Staff workspace unavailable");
    }
  },
  async command(session: Session, command: Command) {
    const { action, ...payload } = command;
    const sql = db();
    try {
      await sql`select rose_care.staff_command(${session.user}::uuid,${session.session}::uuid,${action},${sql.json(payload)})`;
      return "ok";
    } catch (error) {
      switch (databaseCode(error)) {
        case "42501":
          return "denied";
        case "40001":
        case "40P01":
        case "55P03":
          return "conflict";
        case "22023":
        case "22003":
        case "23505":
        case "23514":
        case "22P02":
          return "invalid";
        default:
          return "unavailable";
      }
    }
  },
  async redeem(session: Session) {
    try {
      await db()`select rose_care.staff_redeem(${session.user}::uuid,${session.session}::uuid)`;
      return true;
    } catch {
      return false;
    }
  },
  async guidePath(session: Session, id: string) {
    try {
      const [row] =
        await db()`select rose_care.staff_guide_path(${session.user}::uuid,${session.session}::uuid,${id}::uuid) as result`;
      return typeof row.result === "string" ? row.result : null;
    } catch {
      return null;
    }
  },
};
export class StaffDenied extends Error {}
