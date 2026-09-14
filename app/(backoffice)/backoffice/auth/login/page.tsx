import type { Metadata } from "next";
import { BackofficeLogin } from "@/feature/backoffice/components/backoffice-login";
import { notFound } from "next/navigation";
import { authConfigured, isLocalPreview } from "@/feature/backoffice/auth/session";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ",
};

export default function BackofficeLoginPage() {
  if (!authConfigured() && !isLocalPreview()) notFound();

  return <BackofficeLogin />;
}
