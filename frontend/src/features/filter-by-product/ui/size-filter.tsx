"use client";

import { formatSize, useGetFilterColorsQuery } from "@/entities/report";
import { useAppDispatch, useAppSelector } from "@/shared/lib/store";

import {
  selectSelectedColors,
  selectSelectedNames,
  selectSelectedSizes,
  sizesChanged,
} from "../model/slice";
import { CheckboxFilter } from "./checkbox-filter";

const bySize = new Intl.Collator("ru", { numeric: true }).compare;

export function SizeFilter({ ownerId }: { ownerId: string }) {
  const dispatch = useAppDispatch();
  const names = useAppSelector(selectSelectedNames);
  const colors = useAppSelector(selectSelectedColors);
  const selected = useAppSelector(selectSelectedSizes);
  const noColors = names?.length === 0 || colors?.length === 0;

  const { data = [], isLoading } = useGetFilterColorsQuery(
    { ownerId, names },
    { skip: names?.length === 0 },
  );
  const sizes = new Set(
    data
      .filter((color) => colors === null || colors.includes(color.nm_id))
      .flatMap((color) => color.sizes),
  );

  return (
    <CheckboxFilter
      title="Размер"
      allLabel="Все размеры"
      countLabel="Размеры"
      emptyText="Нет данных о размерах. Если отчёт был загружен раньше, чем появилась детализация, загрузите его заново."
      options={[...sizes].sort(bySize).map((size) => ({ value: size, label: formatSize(size) }))}
      selected={selected}
      disabled={isLoading || noColors}
      onChange={(next) => dispatch(sizesChanged(next))}
    />
  );
}
