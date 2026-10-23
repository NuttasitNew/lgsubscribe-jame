import { SeoProviders } from "@/feature/backoffice/seo/shared/components/seo-providers";

// The article editor CSS (seo-article-document.css) reads --font-sarabun / --font-kanit;
// point both at the site font so the editor looks like the public /blog page.
export default function SeoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ["--font-sarabun" as string]: "inherit", ["--font-kanit" as string]: "inherit" }}>
      <SeoProviders>{children}</SeoProviders>
    </div>
  );
}
