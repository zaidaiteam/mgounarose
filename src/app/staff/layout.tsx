import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { staffEnabled } from "@/lib/staff/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default function StaffLayout({ children }: { children: ReactNode }) {
  if (!staffEnabled()) notFound();
  return children;
}
