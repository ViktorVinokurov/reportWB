import type { SummaryRow } from "@/entities/report";
import { baseApi } from "@/shared/api";

interface ImportWbReportRequest {
  ownerId: string;
  /** dateFrom — понедельник недели отчёта. advertising = null — реклама из отчёта WB. */
  weeks: { dateFrom: string; advertising: number | null }[];
}

interface ImportWbReportResponse {
  reports: SummaryRow[];
  /** Понедельники недель, за которые у WB нет отчёта. */
  missing_weeks: string[];
}

export const importWbReportApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    importWbReport: build.mutation<ImportWbReportResponse, ImportWbReportRequest>({
      query: ({ ownerId, weeks }) => ({
        url: "reports/wb-import",
        method: "POST",
        body: {
          owner_id: ownerId,
          weeks: weeks.map(({ dateFrom, advertising }) => ({ date_from: dateFrom, advertising })),
        },
      }),
      invalidatesTags: ["Summary", "ProductNames"],
    }),
  }),
});

export const { useImportWbReportMutation } = importWbReportApi;
