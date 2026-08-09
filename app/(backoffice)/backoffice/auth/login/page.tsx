import type { Metadata } from "next";
import { BackofficeLogin } from "@/feature/backoffice/components/backoffice-login";
import { requireLocalBackofficePreview } from "@/feature/backoffice/require-local-backoffice-preview";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ",
};

export default function BackofficeLoginPage() {
  // Page-level guard prevents Next static export from serializing private UI into the production artifact.
  requireLocalBackofficePreview();

  return <BackofficeLogin />;
}
