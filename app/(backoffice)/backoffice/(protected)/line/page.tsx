import { BackofficeDashboard } from "@/feature/backoffice/components/backoffice-dashboard";
import { getBackofficeLineOverview } from "@/feature/backoffice/get-line-dashboard";
import { requireLocalBackofficePreview } from "@/feature/backoffice/require-local-backoffice-preview";
import { requireBackofficeSession } from "@/lib/backoffice/auth";

export default async function BackofficePage() {
  await requireBackofficeSession();
  // Page-level guard keeps the private UI unavailable in production builds.
  requireLocalBackofficePreview();
  const lineOverview = await getBackofficeLineOverview();

  return <BackofficeDashboard lineOverview={lineOverview} />;
}
