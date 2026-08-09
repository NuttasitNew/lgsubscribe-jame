import { BackofficeDashboard } from "@/feature/backoffice/components/backoffice-dashboard";
import { requireLocalBackofficePreview } from "@/feature/backoffice/require-local-backoffice-preview";

export default function BackofficePage() {
  // Page-level guard prevents Next static export from serializing private UI into the production artifact.
  requireLocalBackofficePreview();

  return <BackofficeDashboard />;
}
