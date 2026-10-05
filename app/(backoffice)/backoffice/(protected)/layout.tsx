import { BackofficeShell } from "@/feature/backoffice/components/backoffice-shell";
import { requireBackofficeSession } from "@/lib/backoffice/auth";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireBackofficeSession();
  const showLine = process.env.NODE_ENV === "development" && process.env.BACKOFFICE_DESIGN_PREVIEW === "true";
  return <BackofficeShell showLine={showLine}>{children}</BackofficeShell>;
}
