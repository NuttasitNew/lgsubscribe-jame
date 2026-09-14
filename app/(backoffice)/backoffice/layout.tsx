import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Backoffice",
    template: "%s | Backoffice",
  },
  robots: { index: false, follow: false, nocache: true },
};

// Authentication is checked at every private page, data and action boundary.
// The login route shares this noindex layout but is reachable without a session.
export default function ProtectedBackofficeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
