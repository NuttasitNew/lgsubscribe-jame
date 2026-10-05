import { TZDate } from "react-day-picker";

export const calendarTimeZone = "Asia/Bangkok";
export function calendarDate(value: string) {
  const [year, month, day = 1] = value.split("-").map(Number);
  return new TZDate(year, month - 1, day, 12, 0, 0, calendarTimeZone);
}
export function calendarDay(date: Date) {
  const value = new TZDate(date, calendarTimeZone);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
export function thaiCalendarDate(date: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: calendarTimeZone,
  }).format(date);
}
export function thaiCalendarMonth(date: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
    timeZone: calendarTimeZone,
  }).format(date);
}
