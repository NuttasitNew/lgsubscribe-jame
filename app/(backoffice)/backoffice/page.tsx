import { BackofficeDashboard } from "@/feature/backoffice/components/backoffice-dashboard";
import { getBackofficeLineOverview } from "@/feature/backoffice/get-line-dashboard";
import { requireBackofficeAccess } from "@/feature/backoffice/auth/session";

export default async function BackofficePage() {
  await requireBackofficeAccess();
  const lineOverview = await getBackofficeLineOverview();

  return <BackofficeDashboard lineOverview={lineOverview} />;
}
