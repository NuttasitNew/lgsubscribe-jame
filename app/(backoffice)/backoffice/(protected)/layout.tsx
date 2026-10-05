import { requireBackofficeSession } from "@/lib/backoffice/auth";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireBackofficeSession();
  return children;
}
