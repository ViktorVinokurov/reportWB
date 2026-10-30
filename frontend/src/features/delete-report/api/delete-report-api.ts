import { baseApi } from "@/shared/api";

export const deleteReportApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** reportDate — дата отчёта в формате YYYY-MM-DD. */
    deleteReport: build.mutation<void, { ownerId: string; reportDate: string }>({
      query: ({ ownerId, reportDate }) => ({
        url: `reports/${reportDate}?${new URLSearchParams({ owner_id: ownerId })}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Summary", "ProductNames"],
    }),
  }),
});

export const { useDeleteReportMutation } = deleteReportApi;
