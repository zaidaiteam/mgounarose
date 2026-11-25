import { Hub } from "@/components/hub";

// This route is the credential-free PWA fallback. Keep it entirely fixture-based.
export const dynamic = "force-static";

export default function OfflineDemo() {
  return <Hub />;
}
