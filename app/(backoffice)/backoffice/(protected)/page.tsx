import { redirect } from "next/navigation";
import { requireBackofficeSession } from "@/lib/backoffice/auth";

export default async function BackofficePage() {
  await requireBackofficeSession();
  redirect("/backoffice/analytics/");
}
