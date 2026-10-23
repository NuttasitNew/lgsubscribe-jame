import { Suspense } from "react";
import { requireBackofficeSession } from "@/lib/backoffice/auth";
import { SeoArticleHubMain } from "@/feature/backoffice/seo/seo-article/components/seo-article-hub-main";

export const metadata = { title: "บทความ SEO และ FAQ" };
// AI writing and image jobs run after the server action responds (see schedule-seo-article-job.helper.ts),
// so the actions on this page need the longest function duration.
export const maxDuration = 300;

export default async function SeoPage() {
  await requireBackofficeSession("seo.manage");
  return (
    <Suspense>
      <SeoArticleHubMain />
    </Suspense>
  );
}
