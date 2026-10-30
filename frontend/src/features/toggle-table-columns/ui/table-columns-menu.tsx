"use client";

import { Columns3Icon } from "lucide-react";

import { MetricsMenu } from "@/entities/report";
import { useAppDispatch, useAppSelector } from "@/shared/lib/store";

import { allColumnsShown, columnToggled, selectHiddenColumns } from "../model/slice";

export function TableColumnsMenu() {
  const dispatch = useAppDispatch();
  const hiddenColumns = useAppSelector(selectHiddenColumns);

  return (
    <MetricsMenu
      trigger={
        <>
          <Columns3Icon /> Колонки
        </>
      }
      title="Колонки таблицы"
      isChecked={(key) => !hiddenColumns.includes(key)}
      onToggle={(key) => dispatch(columnToggled(key))}
      onShowAll={() => dispatch(allColumnsShown())}
    />
  );
}
