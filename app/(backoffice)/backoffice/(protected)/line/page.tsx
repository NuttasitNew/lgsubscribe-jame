import { BackofficeDashboard } from "@/feature/backoffice/components/backoffice-dashboard";
import { getBackofficeLineOverview } from "@/feature/backoffice/get-line-dashboard";
import { requireBackofficeSession } from "@/lib/backoffice/auth";

export default async function BackofficePage() {
  await requireBackofficeSession("line.view");
  const lineOverview = await getBackofficeLineOverview();

  return <BackofficeDashboard lineOverview={lineOverview} />;
}
