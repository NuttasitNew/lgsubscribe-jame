import { BackofficeDashboard } from "@/feature/backoffice/components/backoffice-dashboard";
import { getBackofficeLineOverview } from "@/feature/backoffice/get-line-dashboard";
import { requireLocalBackofficePreview } from "@/feature/backoffice/require-local-backoffice-preview";

export default async function BackofficePage() {
  // Page-level guard keeps the private UI unavailable in production builds.
  requireLocalBackofficePreview();
  const lineOverview = await getBackofficeLineOverview();

  return <BackofficeDashboard lineOverview={lineOverview} />;
}
