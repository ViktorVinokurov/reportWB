const integerFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const moneyFormat = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const dateFormat = new Intl.DateTimeFormat("ru-RU", { timeZone: "UTC" });

export type NumberKind = "quantity" | "money" | "percent";

export function formatNumber(value: number | null, kind: NumberKind): string {
  if (value === null) return "—";
  if (kind === "quantity") return integerFormat.format(value);
  if (kind === "percent") return `${moneyFormat.format(value)} %`;
  return moneyFormat.format(value);
}

/** «2026-10-25» → «25.10.2026». Дата без времени, поэтому форматируем в UTC. */
export function formatIsoDate(isoDate: string): string {
  return dateFormat.format(new Date(isoDate));
}
