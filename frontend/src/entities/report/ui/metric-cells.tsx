import { formatNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { TableCell, TableHead } from "@/shared/ui/table";

import type { MetricDefinition } from "../model/metrics";
import type { MetricValues } from "../model/types";

/** Заголовки колонок показателей — общие для сводной таблицы и детализации отчёта. */
export function MetricHeads({ columns }: { columns: readonly MetricDefinition[] }) {
  return columns.map((metric) => (
    <TableHead key={metric.key} className="text-right whitespace-normal max-sm:min-w-24">
      {metric.label}
    </TableHead>
  ));
}

export function MetricCells({
  columns,
  row,
}: {
  columns: readonly MetricDefinition[];
  row: MetricValues;
}) {
  return columns.map((metric) => {
    const value = row[metric.key];
    return (
      <TableCell
        key={metric.key}
        className={cn(
          "text-right tabular-nums",
          metric.signed && value !== null && value < 0 && "text-destructive",
        )}
      >
        {formatNumber(value, metric.kind)}
      </TableCell>
    );
  });
}
