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

/** Значения колонок таблицы. У позиции внутри отчёта реклама и хранение — null: они на весь отчёт. */
export type MetricValues = Record<MetricKey, number | null>;

/** Позиция отчёта — значение колонки «Название». Контракт GET /api/reports/<дата>/products. */
export interface ProductRow extends MetricValues {
  name: string;
}

export interface SizeRow extends MetricValues {
  size: string;
}

/** Цвет позиции — одна карточка WB. Контракт GET /api/reports/<дата>/colors. */
export interface ColorRow extends MetricValues {
  nm_id: number;
  vendor_code: string;
  sizes: SizeRow[];
}

/** Значение фильтра по цвету: цвет выбранных названий и его размеры. Контракт GET /api/reports/filter-colors. */
export interface FilterColor {
  nm_id: number;
  vendor_code: string;
  sizes: string[];
}

/** Цвет и фото из карточки WB. Контракт GET /api/reports/<дата>/cards. */
export interface ProductCard {
  nm_id: number;
  color: string;
  photo_url: string;
  preview_url: string;
}
