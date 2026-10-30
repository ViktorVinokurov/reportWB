/** Строка сводного отчёта — один загруженный файл (одна дата). Контракт GET /api/reports/summary. */
export interface SummaryRow {
  report_date: string;
  orders_qty: number;
  sales_qty: number;
  sales_sum: number;
  logistics: number;
  advertising: number;
  storage: number;
  logistics_per_sale: number | null;
  advertising_per_sale: number | null;
  storage_per_sale: number | null;
  profit: number;
  profit_without_ads: number;
  profit_per_unit: number | null;
  profit_per_unit_without_ads: number | null;
  buyout_percent: number | null;
  tax_3: number | null;
  tax_8: number | null;
  tax_1: number | null;
}

export type MetricKey = Exclude<keyof SummaryRow, "report_date">;
