"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { MetricCells, MetricHeads, METRICS, type SummaryRow } from "@/entities/report";
import { DeleteReportButton } from "@/features/delete-report";
import { selectHiddenColumns, TableColumnsMenu } from "@/features/toggle-table-columns";
import { formatIsoDate } from "@/shared/lib/format";
import { useAppSelector } from "@/shared/lib/store";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";

// Разделитель — псевдоэлемент: при border-collapse граница и тень ячейки не едут вместе со sticky.
const stickyCell =
  "sticky left-0 z-10 bg-card max-md:after:absolute max-md:after:inset-y-0 max-md:after:right-0 max-md:after:w-px max-md:after:bg-border";
const PAGE_SIZE = 10;

interface SummaryTableProps {
  ownerId: string;
  rows: SummaryRow[];
  onOpenReport: (reportDate: string) => void;
}

export function SummaryTable({ ownerId, rows, onOpenReport }: SummaryTableProps) {
  const hiddenColumns = useAppSelector(selectHiddenColumns);
  const columns = METRICS.filter((metric) => !hiddenColumns.includes(metric.key));

  // API отдаёт строки по возрастанию даты (так нужно графику), таблица показывает свежие сверху.
  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => b.report_date.localeCompare(a.report_date)),
    [rows],
  );
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const [requestedPage, setPage] = useState(0);
  // После удаления строки или смены фильтра страниц может стать меньше.
  const page = Math.min(requestedPage, pageCount - 1);
  const pageStart = page * PAGE_SIZE;
  const pageRows = sortedRows.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Сводный отчёт</CardTitle>
        <CardAction>
          <TableColumnsMenu />
        </CardAction>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={stickyCell}>Дата</TableHead>
              <MetricHeads columns={columns} />
              <TableHead className="w-10">
                <span className="sr-only">Действия</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((row) => (
              <TableRow
                key={row.report_date}
                className="cursor-pointer"
                onClick={() => onOpenReport(row.report_date)}
              >
                <TableCell className={stickyCell}>
                  {/* Клик всплывает к строке; кнопка нужна для фокуса с клавиатуры. */}
                  <button type="button" className="font-medium hover:underline">
                    {formatIsoDate(row.report_date)}
                  </button>
                </TableCell>
                <MetricCells columns={columns} row={row} />
                {/* Диалог удаления — портал, но его клики всплывают по дереву React до строки. */}
                <TableCell className="py-0" onClick={(event) => event.stopPropagation()}>
                  <DeleteReportButton ownerId={ownerId} reportDate={row.report_date} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      {pageCount > 1 && (
        <CardFooter className="justify-end gap-2 text-sm text-muted-foreground">
          <span className="mr-2">
            {pageStart + 1}–{pageStart + pageRows.length} из {sortedRows.length}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Предыдущая страница"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeftIcon />
          </Button>
          <span className="tabular-nums">
            {page + 1} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Следующая страница"
            disabled={page === pageCount - 1}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRightIcon />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
