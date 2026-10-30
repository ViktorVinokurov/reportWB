import { baseApi } from "@/shared/api";

import type { SummaryRow } from "../model/types";

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
  }),
});

export const { useGetSummaryQuery, useGetProductNamesQuery } = reportApi;
