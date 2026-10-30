const DAY_MS = 24 * 60 * 60 * 1000;

/** Первая неделя, за которую WB API отдаёт отчёты (данные доступны с 29.01.2024). */
export const FIRST_WEEK = "2024-01-29";
/** Сколько недель показывать за раз. */
export const WEEKS_PAGE = 12;

/** «2026-10-19» + 6 → «2026-10-25». Даты без времени, считаем в UTC. */
export function addDays(isoDate: string, days: number): string {
  return new Date(Date.parse(isoDate) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Понедельник последней завершённой недели: в субботу 31.10.2026 — 19.10.2026. */
export function lastCompletedWeek(today = new Date()): string {
  const iso = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  const daysSinceMonday = (new Date(iso).getUTCDay() + 6) % 7;
  return addDays(iso, -daysSinceMonday - 7);
}

/** До count понедельников подряд в прошлое, начиная с monday и не раньше FIRST_WEEK. */
export function weeksFrom(monday: string, count: number): string[] {
  const weeks: string[] = [];
  for (let week = monday; weeks.length < count && week >= FIRST_WEEK; week = addDays(week, -7)) {
    weeks.push(week);
  }
  return weeks;
}

/** Дата, на которую сохраняется отчёт недели, — день после воскресенья. */
export function reportDateOf(monday: string): string {
  return addDays(monday, 7);
}
