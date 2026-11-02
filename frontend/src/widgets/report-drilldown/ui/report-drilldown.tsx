"use client";

import { ChevronRightIcon } from "lucide-react";
import { useState } from "react";

import {
  formatProductName,
  METRICS,
  type ProductRow,
  type SummaryRow,
  useGetReportProductsQuery,
} from "@/entities/report";
import {
  selectSelectedColors,
  selectSelectedNames,
  selectSelectedSizes,
} from "@/features/filter-by-product";
import { selectHiddenColumns, TableColumnsMenu } from "@/features/toggle-table-columns";
import { getApiErrorMessage } from "@/shared/api";
import { formatIsoDate } from "@/shared/lib/format";
import { useAppSelector } from "@/shared/lib/store";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

import { ColorsTable } from "./colors-table";
import { ProductsTable } from "./products-table";

const crumbLink = "cursor-pointer font-normal text-muted-foreground hover:underline";

interface ReportDrilldownProps {
  ownerId: string;
  /** Строка сводной таблицы, по которой провалились: итог отчёта с учётом фильтра. */
  summary: SummaryRow;
  onBack: () => void;
}

export function ReportDrilldown({ ownerId, summary, onBack }: ReportDrilldownProps) {
  const reportDate = summary.report_date;
  const hiddenColumns = useAppSelector(selectHiddenColumns);
  const columns = METRICS.filter((metric) => !hiddenColumns.includes(metric.key));

  const selectedNames = useAppSelector(selectSelectedNames);
  const nmIds = useAppSelector(selectSelectedColors);
  const sizes = useAppSelector(selectSelectedSizes);
  const { data, isLoading, error } = useGetReportProductsQuery({
    ownerId,
    reportDate,
    nmIds,
    sizes,
  });
  const products: ProductRow[] = (data ?? []).filter(
    (product) => selectedNames === null || selectedNames.includes(product.name),
  );

  const [openedName, setOpenedName] = useState<string | null>(null);
  // Если позиция не прошла фильтры, возвращаемся к списку позиций.
  const opened = products.find((product) => product.name === openedName);

  let content: React.ReactNode;
  if (isLoading) {
    content = <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  } else if (error) {
    content = <p className="py-8 text-center text-muted-foreground">{getApiErrorMessage(error)}</p>;
  } else if (opened) {
    content = (
      <ColorsTable
        ownerId={ownerId}
        reportDate={reportDate}
        position={opened}
        columns={columns}
        nmIds={nmIds}
        sizes={sizes}
      />
    );
  } else {
    content = (
      <ProductsTable
        products={products}
        summary={summary}
        columns={columns}
        onOpen={setOpenedName}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-1">
          <button type="button" className={crumbLink} onClick={onBack}>
            Сводный отчёт
          </button>
          <ChevronRightIcon className="size-4 text-muted-foreground" />
          {opened ? (
            <>
              <button type="button" className={crumbLink} onClick={() => setOpenedName(null)}>
                {formatIsoDate(reportDate)}
              </button>
              <ChevronRightIcon className="size-4 text-muted-foreground" />
              <span>{formatProductName(opened.name)}</span>
            </>
          ) : (
            <span>{formatIsoDate(reportDate)}</span>
          )}
        </CardTitle>
        <CardAction>
          <TableColumnsMenu />
        </CardAction>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3">{content}</CardContent>
    </Card>
  );
}
