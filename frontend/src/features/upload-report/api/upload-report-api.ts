import type { SummaryRow } from "@/entities/report";
import { baseApi } from "@/shared/api";

import type { UploadReportValues } from "../model/schema";

export const uploadReportApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    uploadReport: build.mutation<SummaryRow, UploadReportValues>({
      query: ({ ownerId, files, reportDate, advertising, storage }) => {
        const body = new FormData();
        body.append("owner_id", ownerId);
        // Части одного отчёта: сервер объединяет строки всех файлов.
        for (const file of files) body.append("files", file);
        body.append("report_date", reportDate);
        body.append("advertising", String(advertising));
        body.append("storage", String(storage));
        return { url: "reports", method: "POST", body };
      },
      invalidatesTags: ["Summary", "ProductNames"],
    }),
  }),
});

export const { useUploadReportMutation } = uploadReportApi;
