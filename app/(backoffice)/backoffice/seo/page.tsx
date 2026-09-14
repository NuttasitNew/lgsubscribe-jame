import { SeoDashboard } from "@/feature/backoffice/seo/dashboard";
export const metadata = { title: "ติดตาม SEO" };
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export default async function SeoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <SeoDashboard
      source={typeof params.source === "string" ? params.source : "GSC_API"}
      query={typeof params.q === "string" ? params.q.slice(0, 160) : ""}
      showPaused={params.paused === "1"}
    />
  );
}
