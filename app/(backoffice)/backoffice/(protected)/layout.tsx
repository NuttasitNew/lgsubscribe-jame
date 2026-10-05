import { BackofficeShell } from "@/feature/backoffice/components/backoffice-shell";
import { requireBackofficeSession } from "@/lib/backoffice/auth";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireBackofficeSession();
  return <BackofficeShell user={user}>{children}</BackofficeShell>;
}
