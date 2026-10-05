import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Backoffice",
    template: "%s | Backoffice",
  },
  robots: { index: false, follow: false, nocache: true },
};

export default function ProtectedBackofficeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Login is public. All internal pages live inside (protected) and verify sessions.
  return <>{children}</>;
}
