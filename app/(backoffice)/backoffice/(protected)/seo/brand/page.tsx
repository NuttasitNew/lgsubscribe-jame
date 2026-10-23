import { Suspense } from "react";
import { requireBackofficeSession } from "@/lib/backoffice/auth";
import { BrandProfilePage } from "@/feature/backoffice/seo/brand-profile/components/brand-profile-page";

export const metadata = { title: "ชุดอ้างอิงภาพ AI" };

export default async function SeoBrandPage() {
  await requireBackofficeSession("seo.manage");
  return (
    <Suspense>
      <BrandProfilePage />
    </Suspense>
  );
}
