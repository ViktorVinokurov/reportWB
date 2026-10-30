"use client";

import { ChartLineIcon } from "lucide-react";

import { MetricsMenu } from "@/entities/report";
import { useAppDispatch, useAppSelector } from "@/shared/lib/store";

import { allSeriesShown, selectVisibleSeries, seriesToggled } from "../model/slice";

export function ChartSeriesMenu() {
  const dispatch = useAppDispatch();
  const visibleSeries = useAppSelector(selectVisibleSeries);

  return (
    <MetricsMenu
      trigger={
        <>
          <ChartLineIcon /> Показатели
        </>
      }
      title="Показатели на графике"
      isChecked={(key) => visibleSeries.includes(key)}
      onToggle={(key) => dispatch(seriesToggled(key))}
      onShowAll={() => dispatch(allSeriesShown())}
    />
  );
}
