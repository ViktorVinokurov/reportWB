"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

import { METRICS, type SummaryRow } from "@/entities/report";
import { ChartDatesMenu, selectHiddenDates } from "@/features/toggle-chart-dates";
import { ChartSeriesMenu, selectVisibleSeries } from "@/features/toggle-chart-series";
import { useAppSelector } from "@/shared/lib/store";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

const LineChart = dynamic(() => import("./line-chart"), {
  ssr: false,
  loading: () => <div className="h-[420px] animate-pulse rounded-md bg-muted" />,
});

/** Строит график по тем же строкам, что и таблица (с учётом фильтра по названиям). */
export function SummaryChart({ rows }: { rows: SummaryRow[] }) {
  const visibleSeries = useAppSelector(selectVisibleSeries);
  const metrics = useMemo(
    () => METRICS.filter((metric) => visibleSeries.includes(metric.key)),
    [visibleSeries],
  );
  const hiddenDates = useAppSelector(selectHiddenDates);
  const visibleRows = useMemo(
    () => rows.filter((row) => !hiddenDates.includes(row.report_date)),
    [rows, hiddenDates],
  );

  let emptyMessage: string | null = null;
  if (metrics.length === 0) emptyMessage = "Выберите хотя бы один показатель";
  else if (visibleRows.length === 0) emptyMessage = "Выберите хотя бы одну дату";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Динамика показателей</CardTitle>
        <CardAction className="flex gap-2">
          <ChartDatesMenu dates={rows.map((row) => row.report_date)} />
          <ChartSeriesMenu />
        </CardAction>
      </CardHeader>
      <CardContent>
        {emptyMessage ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <LineChart rows={visibleRows} metrics={metrics} />
        )}
      </CardContent>
    </Card>
  );
}
