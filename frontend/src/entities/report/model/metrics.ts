import type { NumberKind } from "@/shared/lib/format";

import type { MetricKey } from "./types";

export interface MetricDefinition {
  key: MetricKey;
  label: string;
  kind: NumberKind;
  /** Подсвечивать отрицательные значения (прибыль). */
  signed?: boolean;
}

/** Колонки сводного отчёта в порядке ТЗ (после колонки «Дата»). */
export const METRICS: readonly MetricDefinition[] = [
  { key: "orders_qty", label: "Заказы (шт)", kind: "quantity" },
  { key: "sales_qty", label: "Продажи (шт)", kind: "quantity" },
  { key: "sales_sum", label: "Продажи (сумм)", kind: "money" },
  { key: "logistics", label: "Логистика", kind: "money" },
  { key: "advertising", label: "Реклама", kind: "money" },
  { key: "storage", label: "Хранение", kind: "money" },
  { key: "logistics_per_sale", label: "Л на 1 продажу", kind: "money" },
  { key: "advertising_per_sale", label: "Р на 1 продажу", kind: "money" },
  { key: "storage_per_sale", label: "Х на 1 продажу", kind: "money" },
  { key: "profit", label: "Прибыль на р.счёт", kind: "money", signed: true },
  { key: "profit_without_ads", label: "Прибыль (без учёта рекламы)", kind: "money", signed: true },
  { key: "profit_per_unit", label: "Прибыль на 1 шт", kind: "money", signed: true },
  {
    key: "profit_per_unit_without_ads",
    label: "Прибыль на 1 шт (без учёта рекламы)",
    kind: "money",
    signed: true,
  },
  { key: "buyout_percent", label: "% выкупа", kind: "percent" },
  { key: "tax_3", label: "Налог 3%", kind: "money" },
  { key: "tax_8", label: "Налог 8%", kind: "money" },
  { key: "tax_1", label: "Налог 1%", kind: "money" },
];
