"use client";

import { formatProductName, useGetProductNamesQuery } from "@/entities/report";
import { useAppDispatch, useAppSelector } from "@/shared/lib/store";

import { namesChanged, selectSelectedNames } from "../model/slice";
import { CheckboxFilter } from "./checkbox-filter";

export function ProductNameFilter({ ownerId }: { ownerId: string }) {
  const dispatch = useAppDispatch();
  const selected = useAppSelector(selectSelectedNames);
  const { data: names = [], isLoading } = useGetProductNamesQuery(ownerId);

  return (
    <CheckboxFilter
      title="Название"
      allLabel="Все названия"
      countLabel="Названия"
      emptyText="Нет загруженных отчётов"
      options={names.map((name) => ({ value: name, label: formatProductName(name) }))}
      selected={selected}
      disabled={isLoading}
      onChange={(next) => dispatch(namesChanged(next))}
    />
  );
}
