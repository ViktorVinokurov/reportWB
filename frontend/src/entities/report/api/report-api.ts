import { baseApi } from "@/shared/api";

import type { ColorRow, ProductCard, ProductRow, SummaryRow } from "../model/types";

interface ProductQuery {
  ownerId: string;
  reportDate: string;
  name: string;
}

const productUrl = (part: string, { ownerId, reportDate, name }: ProductQuery) =>
  `reports/${reportDate}/${part}?${new URLSearchParams({ owner_id: ownerId, name })}`;

export const reportApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** names = null — все названия; иначе фильтр по колонке «Название». */
    getSummary: build.query<SummaryRow[], { ownerId: string; names: string[] | null }>({
      query: ({ ownerId, names }) => {
        const params = new URLSearchParams({ owner_id: ownerId });
        for (const name of names ?? []) params.append("name", name);
        return `reports/summary?${params}`;
      },
      providesTags: ["Summary"],
    }),
    getProductNames: build.query<string[], string>({
      query: (ownerId) => `reports/product-names?${new URLSearchParams({ owner_id: ownerId })}`,
      providesTags: ["ProductNames"],
    }),
    getReportProducts: build.query<ProductRow[], { ownerId: string; reportDate: string }>({
      query: ({ ownerId, reportDate }) =>
        `reports/${reportDate}/products?${new URLSearchParams({ owner_id: ownerId })}`,
      providesTags: ["Summary"],
    }),
    getProductColors: build.query<ColorRow[], ProductQuery>({
      query: (arg) => productUrl("colors", arg),
      providesTags: ["Summary"],
    }),
    getProductCards: build.query<ProductCard[], ProductQuery>({
      query: (arg) => productUrl("cards", arg),
      providesTags: ["Summary"],
    }),
  }),
});

export const {
  useGetProductCardsQuery,
  useGetProductColorsQuery,
  useGetProductNamesQuery,
  useGetReportProductsQuery,
  useGetSummaryQuery,
} = reportApi;
