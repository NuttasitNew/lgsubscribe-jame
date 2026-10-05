export type Attribution = {
  source: string;
  medium: string;
  channel: string;
  campaign: string | null;
  attributionMethod: string;
  referrerHost: string | null;
  clickId: string | null;
};

function label(value: unknown, limit: number) {
  if (
    typeof value !== "string" ||
    value.length > limit ||
    /[@\x00-\x1f<>]/.test(value) ||
    /\d{9,}/.test(value)
  )
    return null;
  return value.trim() || null;
}

export function attributionFromUrl(url: string, referrer: string): Attribution {
  const landing = new URL(url);
  const params = landing.searchParams;
  let referrerHost: string | null = null;
  try {
    const from = new URL(referrer);
    if (
      from.hostname !== landing.hostname &&
      !["www.lgthailand-subscribe.com", "lgthailand-subscribe.com"].includes(from.hostname)
    )
      referrerHost = from.hostname;
  } catch {
    /* Direct traffic */
  }
  const campaign = label(params.get("utm_campaign"), 150);
  const clickId =
    ["gclid", "gbraid", "wbraid"]
      .map((key) => params.get(key))
      .find((value) => value && /^[a-zA-Z0-9_-]{1,250}$/.test(value)) ?? null;
  if (clickId)
    return {
      source: "google",
      medium: "cpc",
      channel: "google_ads",
      campaign,
      attributionMethod: "click_id",
      referrerHost,
      clickId,
    };
  const source = label(params.get("utm_source"), 150)?.toLowerCase();
  const medium = label(params.get("utm_medium"), 50)?.toLowerCase();
  if (source) {
    const channel = /^(cpc|ppc|paidsearch|paid_search)$/.test(medium ?? "")
      ? "paid_search"
      : /^(paid_social|paidsocial)$/.test(medium ?? "")
        ? "paid_social"
        : /^(display|cpm|banner)$/.test(medium ?? "")
          ? "display"
          : medium === "email"
            ? "email"
            : /^(social|social-network)$/.test(medium ?? "")
              ? "social"
              : "campaign";
    return {
      source,
      medium: medium ?? "(not set)",
      channel,
      campaign,
      attributionMethod: "utm",
      referrerHost,
      clickId: null,
    };
  }
  if (!referrerHost)
    return {
      source: "(direct)",
      medium: "(none)",
      channel: "direct",
      campaign: null,
      attributionMethod: "direct",
      referrerHost: null,
      clickId: null,
    };
  const ai = ["chatgpt.com", "chat.openai.com", "gemini.google.com", "perplexity.ai", "claude.ai"].some(
    (host) => referrerHost === host || referrerHost!.endsWith(`.${host}`),
  );
  const social = [
    "facebook.com",
    "instagram.com",
    "t.co",
    "twitter.com",
    "tiktok.com",
    "line.me",
    "lin.ee",
  ].some((host) => referrerHost === host || referrerHost!.endsWith(`.${host}`));
  const search = /(^|\.)(google\.[a-z.]+|bing.com|search.yahoo.com|duckduckgo.com)$/.test(referrerHost);
  return {
    source: referrerHost,
    medium: ai ? "ai-assistant" : social ? "social" : search ? "organic" : "referral",
    channel: ai ? "ai_assistant" : social ? "social" : search ? "organic_search" : "referral",
    campaign: null,
    attributionMethod: "referrer",
    referrerHost,
    clickId: null,
  };
}

export function normalizeAttribution(input: unknown): Attribution {
  if (!input || typeof input !== "object")
    return {
      source: "unknown",
      medium: "unknown",
      channel: "unknown",
      campaign: null,
      attributionMethod: "unknown",
      referrerHost: null,
      clickId: null,
    };
  const data = input as Record<string, unknown>;
  // Reclassify on the server rather than trusting client-supplied channel labels.
  const params = new URLSearchParams();
  if (label(data.source, 150) && data.attributionMethod === "utm")
    params.set("utm_source", data.source as string);
  if (label(data.medium, 50)) params.set("utm_medium", data.medium as string);
  if (label(data.campaign, 150)) params.set("utm_campaign", data.campaign as string);
  if (typeof data.clickId === "string" && /^[a-zA-Z0-9_-]{1,250}$/.test(data.clickId))
    params.set("gclid", data.clickId);
  const host =
    typeof data.referrerHost === "string" && /^(?=.{1,253}$)[a-z0-9.-]+$/i.test(data.referrerHost)
      ? data.referrerHost
      : "";
  if (data.attributionMethod === "click_id" && !params.has("gclid")) params.set("gclid", "present");
  const result = attributionFromUrl(
    `https://www.lgthailand-subscribe.com/?${params}`,
    host ? `https://${host}/` : "",
  );
  if (!data.clickId) result.clickId = null;
  return result;
}

export function contactMethodForLink(href: string) {
  try {
    const url = new URL(href);
    if (["line.me", "lin.ee"].includes(url.hostname)) return "line";
    if (url.protocol === "tel:" && ["+66849748429", "+66865515949"].includes(url.pathname)) return "phone";
    if (url.protocol === "mailto:" && url.pathname === "lgsubscribe.th@gmail.com") return "email";
  } catch {
    /* Unrelated link */
  }
  return null;
}
