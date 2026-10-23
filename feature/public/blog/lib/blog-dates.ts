/** "2026-10-23" → "23 ต.ค. 2569" (Buddhist year, as on the rest of the site). */
export function formatThaiDate(isoDate: string) {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date(`${isoDate}T00:00:00+07:00`));
}
