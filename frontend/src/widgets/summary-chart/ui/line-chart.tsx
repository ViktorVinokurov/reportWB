"use client";

import * as am5 from "@amcharts/amcharts5";
import am5locales_ru_RU from "@amcharts/amcharts5/locales/ru_RU";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import am5themes_Dark from "@amcharts/amcharts5/themes/Dark";
import * as am5xy from "@amcharts/amcharts5/xy";
import { useTheme } from "next-themes";
import { useLayoutEffect, useRef } from "react";

import type { MetricDefinition, SummaryRow } from "@/entities/report";

interface LineChartProps {
  rows: SummaryRow[];
  metrics: MetricDefinition[];
}

/** amCharts 5 работает только в браузере — подключается через next/dynamic без SSR. */
export default function LineChart({ rows, metrics }: LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const root = am5.Root.new(containerRef.current);
    root.locale = am5locales_ru_RU;
    // Даты отчётов без времени — показываем их в UTC, чтобы не съезжал день.
    root.utc = true;
    root.numberFormatter.set("numberFormat", "#,###.##");
    root.setThemes(
      resolvedTheme === "dark"
        ? [am5themes_Animated.new(root), am5themes_Dark.new(root)]
        : [am5themes_Animated.new(root)],
    );

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: false,
        panY: false,
        wheelX: "none",
        wheelY: "none",
        layout: root.verticalLayout,
      }),
    );
    // Зум по X: выделение диапазона мышью или ползунки скроллбара; колесо не трогаем,
    // чтобы не мешать прокрутке страницы.
    chart.set("cursor", am5xy.XYCursor.new(root, { behavior: "zoomX" }));

    const xAxis = chart.xAxes.push(
      am5xy.DateAxis.new(root, {
        baseInterval: { timeUnit: "day", count: 1 },
        renderer: am5xy.AxisRendererX.new(root, { minGridDistance: 70 }),
        tooltip: am5.Tooltip.new(root, {}),
      }),
    );
    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, { renderer: am5xy.AxisRendererY.new(root, {}) }),
    );

    const scrollbarX = am5.Scrollbar.new(root, { orientation: "horizontal", marginTop: 12 });
    chart.set("scrollbarX", scrollbarX);
    chart.bottomAxesContainer.children.push(scrollbarX);

    const data = rows.map((row) => ({ ...row, date: Date.parse(row.report_date) }));
    for (const metric of metrics) {
      // Сглаживание только по X: кривая не выходит за значения соседних точек по вертикали.
      const series = chart.series.push(
        am5xy.SmoothedXLineSeries.new(root, {
          name: metric.label,
          xAxis,
          yAxis,
          valueXField: "date",
          valueYField: metric.key,
          tooltip: am5.Tooltip.new(root, { labelText: "{name}: {valueY}" }),
        }),
      );
      series.strokes.template.set("strokeWidth", 2);
      series.bullets.push(() =>
        am5.Bullet.new(root, {
          sprite: am5.Circle.new(root, { radius: 4, fill: series.get("fill") }),
        }),
      );
      series.data.setAll(data);
    }

    const legend = chart.children.push(
      am5.Legend.new(root, { centerX: am5.p50, x: am5.p50, layout: root.gridLayout }),
    );
    legend.data.setAll(chart.series.values);

    return () => root.dispose();
  }, [rows, metrics, resolvedTheme]);

  return <div ref={containerRef} className="h-[420px] w-full" />;
}
