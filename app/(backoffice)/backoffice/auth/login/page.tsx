import type { Metadata } from "next";
import { BackofficeLogin } from "@/feature/backoffice/components/backoffice-login";
import { authConfigured } from "@/lib/backoffice/auth";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ",
};

export const dynamic = "force-dynamic";

export default function BackofficeLoginPage() {
  return <BackofficeLogin configured={authConfigured()} />;
}
