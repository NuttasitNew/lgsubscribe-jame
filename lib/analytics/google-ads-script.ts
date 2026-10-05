export const ga4Manifest = {
  timeZone: "Asia/Bangkok",
  dependencies: {
    enabledAdvancedServices: [{ userSymbol: "AnalyticsData", version: "v1beta", serviceId: "analyticsdata" }],
  },
  exceptionLogging: "STACKDRIVER",
  runtimeVersion: "V8",
  oauthScopes: [
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/script.external_request",
  ],
};

const transportHelpers = String.raw`function upload(snapshot) {
  const body = JSON.stringify(snapshot), timestamp = String(Date.now());
  const bytes = Utilities.computeHmacSha256Signature(timestamp + "." + body, CONFIG.secret, Utilities.Charset.UTF_8);
  const signature = bytes.map(b => (b & 255).toString(16).padStart(2, "0")).join("");
  const response = UrlFetchApp.fetch(CONFIG.endpoint, { method: "post", contentType: "application/json", payload: body, headers: { "x-sync-timestamp": timestamp, "x-sync-signature": signature }, muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) throw new Error("Report upload failed: HTTP " + response.getResponseCode());
}
function shiftDay(day, offset) { return new Date(Date.parse(day + "T00:00:00Z") + offset * 86400000).toISOString().slice(0, 10); }
function gaDay(day) { return day.slice(0, 4) + "-" + day.slice(4, 6) + "-" + day.slice(6, 8); }`;

export function buildGa4ReportScript(config: {
  endpoint: string;
  secret: string;
  customerId: string;
  propertyId: string;
  historyRange?: { start: string; end: string };
}) {
  return String.raw`// LG Subscribe GA4: use Google Apps Script and add the AnalyticsData service.
// Schedule daily. Initial run backfills 35 days; reruns refresh late conversions.
const CONFIG = ${JSON.stringify(config)};
const LOOKBACK_DAYS = 35;
// For an initial historical backfill set YYYY-MM-DD; then reset to an empty string.
const BACKFILL_FROM = ${JSON.stringify(config.historyRange?.start ?? "")};
const BACKFILL_UNTIL = ${JSON.stringify(config.historyRange?.end ?? "")};

function main() {
  if (typeof AnalyticsData === "undefined") throw new Error("Add the AnalyticsData service in Google Apps Script first");
  const today = Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd");
  const end = BACKFILL_UNTIL || shiftDay(today, -1);
  const start = BACKFILL_FROM || shiftDay(today, -LOOKBACK_DAYS);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || start > end) throw new Error("Invalid backfill start");
  const days = [];
  for (let day = start; day <= end; day = shiftDay(day, 1)) days.push(day);
  if (days.length > 366) throw new Error("Backfill at most 366 days per run");
  const asOf = new Date().toISOString();
  // Retrieve all reports before uploading so API errors cannot become zero snapshots.
  const daily = gaReport(start, end, ["date"], ["activeUsers", "sessions", "screenPageViews"]);
  const channels = gaReport(start, end, ["date", "sessionSourceMedium"], ["activeUsers", "sessions", "screenPageViews"]);
  const contacts = gaReport(start, end, ["date", "sessionSourceMedium"], ["eventCount"], { filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: "contact_click" } } });
  const ga = {};
  const quality = [daily, channels, contacts].map(report => report.quality);
  const gaQuality = quality.includes("partial") ? "partial" : quality.includes("sampled") ? "sampled" : quality.includes("thresholded") ? "thresholded" : "reported";
  days.forEach(day => { ga[day] = { __total__: { segment: "__total__", label: "Daily total", visitors: 0, sessions: 0, views: 0, contactClicks: 0 } }; });
  daily.rows.forEach(row => {
    const day = gaDay(row.dimensionValues[0].value);
    ga[day].__total__ = { segment: "__total__", label: "Daily total", visitors: Number(row.metricValues[0].value), sessions: Number(row.metricValues[1].value), views: Number(row.metricValues[2].value), contactClicks: 0 };
  });
  channels.rows.forEach(row => {
    const day = gaDay(row.dimensionValues[0].value), label = row.dimensionValues[1].value;
    ga[day]["channel:" + label] = { segment: "channel:" + label, label: label, visitors: Number(row.metricValues[0].value), sessions: Number(row.metricValues[1].value), views: Number(row.metricValues[2].value), contactClicks: 0 };
  });
  contacts.rows.forEach(row => {
    const day = gaDay(row.dimensionValues[0].value), label = row.dimensionValues[1].value, count = Number(row.metricValues[0].value);
    if (!ga[day]["channel:" + label]) ga[day]["channel:" + label] = { segment: "channel:" + label, label: label, visitors: 0, sessions: 0, views: 0, contactClicks: 0 };
    ga[day]["channel:" + label].contactClicks = count;
    ga[day].__total__.contactClicks += count;
  });
  days.forEach(day => {
    upload({ provider: "ga4", externalId: CONFIG.propertyId, day: day, timeZone: "Asia/Bangkok", currency: "THB", quality: gaQuality, asOf: asOf, rows: Object.values(ga[day]) });
  });
  Logger.log("Exported GA4 for " + days.length + " days.");
}

function gaReport(start, end, dimensions, metrics, dimensionFilter) {
  const request = { dateRanges: [{ startDate: start, endDate: end }], dimensions: dimensions.map(name => ({ name: name })), metrics: metrics.map(name => ({ name: name })), limit: 10000, offset: 0 };
  if (dimensionFilter) request.dimensionFilter = dimensionFilter;
  const rows = [];
  let quality = "reported";
  let rowCount = 0;
  do {
    const report = AnalyticsData.Properties.runReport(request, "properties/" + CONFIG.propertyId);
    const metadata = report.metadata || {};
    if (metadata.timeZone !== "Asia/Bangkok" || (metadata.currencyCode && metadata.currencyCode !== "THB")) throw new Error("GA4 timezone/currency mismatch");
    if (metadata.dataLossFromOtherRow) quality = "partial";
    else if (metadata.samplingMetadatas && metadata.samplingMetadatas.length && quality !== "partial") quality = "sampled";
    else if (metadata.subjectToThresholding && quality === "reported") quality = "thresholded";
    const page = report.rows || [];
    rowCount = Number(report.rowCount || 0);
    if (rowCount > 50000) throw new Error("Report too large; backfill a shorter period");
    if (!page.length && rows.length < rowCount) throw new Error("Incomplete GA4 page");
    rows.push.apply(rows, page);
    request.offset = rows.length;
  } while (rows.length < rowCount);
  return { rows: rows, quality: quality };
}
${transportHelpers}

`;
}

export function buildGoogleReportScript(config: {
  endpoint: string;
  secret: string;
  customerId: string;
  propertyId: string;
  historyRange?: { start: string; end: string };
}) {
  return String.raw`// LG Subscribe Google Ads: read daily reports only. No Advanced APIs required.
// Schedule daily. This script does not change campaigns or budgets.
const CONFIG = ${JSON.stringify(config)};
const LOOKBACK_DAYS = 35;
const BACKFILL_FROM = ${JSON.stringify(config.historyRange?.start ?? "")};
const BACKFILL_UNTIL = ${JSON.stringify(config.historyRange?.end ?? "")};
function main() {
  const account = AdsApp.currentAccount();
  if (account.getCustomerId().replace(/-/g, "") !== CONFIG.customerId) throw new Error("Wrong Google Ads account");
  if (account.getTimeZone() !== "Asia/Bangkok" || account.getCurrencyCode() !== "THB") throw new Error("Unexpected account timezone/currency");
  const today = Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd");
  const end = BACKFILL_UNTIL || shiftDay(today, -1), start = BACKFILL_FROM || shiftDay(today, -LOOKBACK_DAYS);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || start > end) throw new Error("Invalid backfill start");
  const days = [], ads = {};
  for (let day = start; day <= end; day = shiftDay(day, 1)) { days.push(day); ads[day] = []; }
  if (days.length > 366) throw new Error("Backfill at most 366 days per run");
  const asOf = new Date().toISOString();
  const query = "SELECT segments.date, campaign.id, campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.all_conversions FROM campaign WHERE segments.date BETWEEN '" + start + "' AND '" + end + "'";
  const result = AdsApp.search(query);
  while (result.hasNext()) {
    const row = result.next();
    ads[row.segments.date].push({ segment: String(row.campaign.id), label: row.campaign.name, impressions: Number(row.metrics.impressions), clicks: Number(row.metrics.clicks), costMicros: Number(row.metrics.costMicros), conversions: Number(row.metrics.conversions), allConversions: Number(row.metrics.allConversions) });
  }
  days.forEach(day => upload({ provider: "google_ads", externalId: CONFIG.customerId, day: day, timeZone: "Asia/Bangkok", currency: "THB", quality: "reported", asOf: asOf, rows: ads[day] }));
  Logger.log("Exported Google Ads for " + days.length + " days.");
}
${transportHelpers}
`;
}
