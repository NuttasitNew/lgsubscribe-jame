import { allowedPages } from "@/lib/backoffice/permissions";
import { redirect } from "next/navigation";
import { requireBackofficeSession } from "@/lib/backoffice/auth";

export default async function BackofficePage() {
  const user = await requireBackofficeSession();
  redirect(allowedPages(user)[0]?.href ?? "/backoffice/access-denied/");
}
