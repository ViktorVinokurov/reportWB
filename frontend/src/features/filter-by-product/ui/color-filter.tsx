"use client";

import { useState } from "react";

import { useGetFilterCardsQuery, useGetFilterColorsQuery } from "@/entities/report";
import { getApiErrorMessage } from "@/shared/api";
import { useAppDispatch, useAppSelector } from "@/shared/lib/store";

import { colorsChanged, selectSelectedColors, selectSelectedNames } from "../model/slice";
import { CheckboxFilter } from "./checkbox-filter";

export function ColorFilter({ ownerId }: { ownerId: string }) {
  const dispatch = useAppDispatch();
  const names = useAppSelector(selectSelectedNames);
  const selected = useAppSelector(selectSelectedColors);
  const noNames = names?.length === 0;
  const query = { ownerId, names };

  const { data: colors = [], isLoading } = useGetFilterColorsQuery(query, { skip: noNames });
  // Названия цветов нужны только в открытом списке: страница не ждёт ответа WB.
  const [isOpen, setIsOpen] = useState(false);
  const { data: cards = [], error } = useGetFilterCardsQuery(query, { skip: noNames || !isOpen });

  return (
    <CheckboxFilter
      title="Цвет"
      allLabel="Все цвета"
      countLabel="Цвета"
      emptyText="Нет данных о цветах. Если отчёт был загружен раньше, чем появилась детализация, загрузите его заново."
      options={colors.map((color) => {
        const name = cards.find((card) => card.nm_id === color.nm_id)?.color;
        const code = color.vendor_code || String(color.nm_id);
        return { value: color.nm_id, label: name || code, hint: name ? code : undefined };
      })}
      selected={selected}
      disabled={isLoading || noNames}
      notice={error ? getApiErrorMessage(error) : undefined}
      onChange={(next) => dispatch(colorsChanged(next))}
      onOpenChange={setIsOpen}
    />
  );
}
