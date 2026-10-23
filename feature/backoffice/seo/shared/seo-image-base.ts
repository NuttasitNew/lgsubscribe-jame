/**
 * Public base URL of the R2 bucket `lg-jame-media` (r2.dev). Override with NEXT_PUBLIC_R2_PUBLIC_URL
 * when a custom domain is attached. Used client-side to validate brand reference image URLs.
 */
export const SEO_IMAGE_PUBLIC_BASE = (
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "https://pub-cae070486a8a4b428b7435de2511207f.r2.dev"
).replace(/\/$/, "");
