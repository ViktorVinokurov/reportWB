import { baseApi } from "@/shared/api";

import type { ColorRow, FilterColor, ProductCard, ProductRow, SummaryRow } from "../model/types";

interface ProductQuery {
  ownerId: string;
  reportDate: string;
  name: string;
}

/** В каждом поле null — без фильтра. */
interface VariantFilter {
  nmIds: number[] | null;
  sizes: string[] | null;
}

/** names = null — все названия; иначе фильтр по колонке «Название». */
interface NamesQuery {
  ownerId: string;
  names: string[] | null;
}

const productUrl = (part: string, { ownerId, reportDate, name }: ProductQuery) =>
  `reports/${reportDate}/${part}?${new URLSearchParams({ owner_id: ownerId, name })}`;

function namesParams({ ownerId, names }: NamesQuery) {
  const params = new URLSearchParams({ owner_id: ownerId });
  for (const name of names ?? []) params.append("name", name);
  return params;
}

function withVariantFilter(params: URLSearchParams, { nmIds, sizes }: VariantFilter) {
  for (const nmId of nmIds ?? []) params.append("nm_id", String(nmId));
  for (const size of sizes ?? []) params.append("size", size);
  return params;
}

export const reportApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSummary: build.query<SummaryRow[], NamesQuery & VariantFilter>({
      query: (arg) => `reports/summary?${withVariantFilter(namesParams(arg), arg)}`,
      providesTags: ["Summary"],
    }),
    getProductNames: build.query<string[], string>({
      query: (ownerId) => `reports/product-names?${new URLSearchParams({ owner_id: ownerId })}`,
      providesTags: ["ProductNames"],
    }),
    getFilterColors: build.query<FilterColor[], NamesQuery>({
      query: (arg) => `reports/filter-colors?${namesParams(arg)}`,
      providesTags: ["Summary"],
    }),
    getFilterCards: build.query<ProductCard[], NamesQuery>({
      query: (arg) => `reports/filter-cards?${namesParams(arg)}`,
      providesTags: ["Summary"],
    }),
    getReportProducts: build.query<
      ProductRow[],
      { ownerId: string; reportDate: string } & VariantFilter
    >({
      query: ({ ownerId, reportDate, ...filter }) =>
        `reports/${reportDate}/products?${withVariantFilter(new URLSearchParams({ owner_id: ownerId }), filter)}`,
      providesTags: ["Summary"],
    }),
    getProductColors: build.query<ColorRow[], ProductQuery & VariantFilter>({
      query: ({ ownerId, reportDate, name, ...filter }) =>
        `reports/${reportDate}/colors?${withVariantFilter(new URLSearchParams({ owner_id: ownerId, name }), filter)}`,
      providesTags: ["Summary"],
    }),
    getProductCards: build.query<ProductCard[], ProductQuery>({
      query: (arg) => productUrl("cards", arg),
      providesTags: ["Summary"],
    }),
  }),
});

export const {
  useGetFilterCardsQuery,
  useGetFilterColorsQuery,
  useGetProductCardsQuery,
  useGetProductColorsQuery,
  useGetProductNamesQuery,
  useGetReportProductsQuery,
  useGetSummaryQuery,
} = reportApi;
