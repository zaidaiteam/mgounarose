import { redirect } from "next/navigation";
import { staffEnabled } from "@/lib/staff/config";

export const dynamic = "force-dynamic";
export default function Page() {
  redirect(staffEnabled() ? "/staff/workspace" : "/demo/");
}
