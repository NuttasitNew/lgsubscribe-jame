export function bangkokToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function monthRange(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("เดือนที่เลือกไม่ถูกต้อง");
  const [year, number] = month.split("-").map(Number);
  return { start: `${month}-01`, end: `${month}-${new Date(Date.UTC(year, number, 0)).getUTCDate()}` };
}

function validDay(day: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    Number(day.slice(0, 4)) >= 2000 &&
    Number.isFinite(Date.parse(`${day}T00:00:00Z`)) &&
    new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day
  );
}

export function dateRange(start: string, end: string) {
  if (!validDay(start) || !validDay(end)) throw new Error("กรุณาเลือกวันที่ให้ถูกต้อง");
  const from = new Date(`${start}T00:00:00+07:00`);
  const until = new Date(new Date(`${end}T00:00:00+07:00`).getTime() + 86400000);
  const days = (until.getTime() - from.getTime()) / 86400000;
  if (days < 1) throw new Error("วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น");
  if (days > 366) throw new Error("เลือกช่วงเวลาได้ไม่เกิน 366 วันต่อครั้ง");
  return { start, end, from, until, days };
}

export function dailyRows(
  start: string,
  days: number,
  data: Array<{ day: string; visitors: number; views: number }>,
) {
  const lookup = new Map(data.map((row) => [row.day, row]));
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(Date.parse(`${start}T00:00:00Z`) + index * 86400000).toISOString().slice(0, 10);
    return lookup.get(day) ?? { day, visitors: 0, views: 0 };
  });
}
