import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isSubscribeDayActive, subscribeDayCampaign } from "@/lib/subscribe-day";

// Older ads and shared links use this path; send them (with their query, e.g. `kw`) to the
// current promotion while it runs.
export default async function LegacySubscribeDayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  if (!isSubscribeDayActive()) redirect("/");
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item);
  }
  const search = query.toString();
  redirect(search ? `${subscribeDayCampaign.path}?${search}` : subscribeDayCampaign.path);
}
