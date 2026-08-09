import { notFound } from "next/navigation";

export function requireLocalBackofficePreview() {
  const canPreviewLocally =
    process.env.NODE_ENV === "development" && process.env.BACKOFFICE_DESIGN_PREVIEW === "true";

  if (!canPreviewLocally) {
    notFound();
  }
}
