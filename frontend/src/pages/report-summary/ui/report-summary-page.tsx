"use client";

import { useState } from "react";

import { useGetOwnersQuery } from "@/entities/owner";
import { useGetSummaryQuery } from "@/entities/report";
import {
  allSelected,
  ProductNameFilter,
  selectSelectedNames,
} from "@/features/filter-by-product-name";
import { OwnerSwitcher, useSelectedOwnerId } from "@/features/select-owner";
import { getApiErrorMessage } from "@/shared/api";
import { useAppDispatch, useAppSelector } from "@/shared/lib/store";
import { AppHeader } from "@/widgets/app-header";
import { ReportDrilldown } from "@/widgets/report-drilldown";
import { SummaryChart } from "@/widgets/summary-chart";
import { SummaryTable } from "@/widgets/summary-table";

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
      {children}
    </div>
  );
}

const skeleton = <div className="h-64 animate-pulse rounded-xl bg-muted" />;

export function ReportSummaryPage() {
  const dispatch = useAppDispatch();
  const { isLoading: ownersLoading, error: ownersError } = useGetOwnersQuery();
  const ownerId = useSelectedOwnerId();
  const selectedNames = useAppSelector(selectSelectedNames);
  const nothingSelected = selectedNames?.length === 0;
  // Таблица и чарт получают одни и те же строки — чарт всегда отражает отфильтрованную таблицу.
  const { data: rows = [], isLoading, error } = useGetSummaryQuery(
    { ownerId: ownerId ?? "", names: selectedNames },
    { skip: !ownerId || nothingSelected },
  );
  const [openedDate, setOpenedDate] = useState<string | null>(null);
  const openedRow = rows.find((row) => row.report_date === openedDate);

  let content: React.ReactNode;
  if (ownersLoading) {
    content = skeleton;
  } else if (ownersError) {
    content = <Message>{getApiErrorMessage(ownersError)}</Message>;
  } else if (!ownerId) {
    content = <Message>ИП пока нет. Добавьте ИП в настройках (шестерёнка в шапке), затем загрузите отчёт.</Message>;
  } else if (nothingSelected) {
    content = <Message>Выберите хотя бы одно название</Message>;
  } else if (isLoading) {
    content = skeleton;
  } else if (error) {
    content = <Message>{getApiErrorMessage(error)}</Message>;
  } else if (rows.length === 0) {
    content = (
      <Message>У этого ИП отчётов пока нет. Нажмите «Загрузить отчёт», чтобы добавить первый.</Message>
    );
  } else {
    content = (
      <>
        {openedRow && (
          <ReportDrilldown
            ownerId={ownerId}
            summary={openedRow}
            onBack={() => setOpenedDate(null)}
          />
        )}
        {/* Таблицу прячем, а не размонтируем: при возврате она остаётся на той же странице. */}
        <div className={openedRow ? "hidden" : "contents"}>
          <SummaryTable ownerId={ownerId} rows={rows} onOpenReport={setOpenedDate} />
        </div>
        {!openedRow && <SummaryChart rows={rows} />}
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto grid w-full max-w-screen-2xl gap-6 px-4 py-6 sm:px-6">
        {ownerId && (
          <div className="flex flex-wrap items-center gap-3">
            {/* У другого ИП свои названия и отчёты — фильтр сбрасываем на «все», детализацию закрываем. */}
            <OwnerSwitcher
              onOwnerChange={() => {
                dispatch(allSelected());
                setOpenedDate(null);
              }}
            />
            <ProductNameFilter ownerId={ownerId} />
          </div>
        )}
        {content}
      </main>
    </>
  );
}
