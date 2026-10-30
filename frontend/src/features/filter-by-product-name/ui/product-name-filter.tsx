"use client";

import { ChevronsUpDownIcon } from "lucide-react";
import { useId } from "react";

import { formatProductName, useGetProductNamesQuery } from "@/entities/report";
import { useAppDispatch, useAppSelector } from "@/shared/lib/store";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Separator } from "@/shared/ui/separator";

import { allCleared, allSelected, nameToggled, selectSelectedNames } from "../model/slice";

export function ProductNameFilter({ ownerId }: { ownerId: string }) {
  const id = useId();
  const dispatch = useAppDispatch();
  const selectedNames = useAppSelector(selectSelectedNames);
  const { data: allNames = [], isLoading } = useGetProductNamesQuery(ownerId);

  const isChecked = (name: string) => selectedNames === null || selectedNames.includes(name);
  const triggerLabel =
    selectedNames === null
      ? "Все названия"
      : // Считаем по актуальному списку: после удаления отчёта в выборе могут остаться пропавшие названия.
        `Выбрано: ${allNames.filter(isChecked).length} из ${allNames.length}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="min-w-56 justify-between" disabled={isLoading}>
          {triggerLabel}
          <ChevronsUpDownIcon className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-medium">Название</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="xs" onClick={() => dispatch(allSelected())}>
              Все
            </Button>
            <Button variant="ghost" size="xs" onClick={() => dispatch(allCleared())}>
              Снять все
            </Button>
          </div>
        </div>
        <Separator />
        <ul className="max-h-72 overflow-y-auto p-2">
          {allNames.length === 0 && (
            <li className="px-2 py-1.5 text-sm text-muted-foreground">Нет загруженных отчётов</li>
          )}
          {allNames.map((name, index) => (
            <li key={name} className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent">
              <Checkbox
                id={`${id}-${index}`}
                checked={isChecked(name)}
                onCheckedChange={() => dispatch(nameToggled({ name, allNames }))}
              />
              <Label htmlFor={`${id}-${index}`} className="flex-1 cursor-pointer font-normal">
                {formatProductName(name)}
              </Label>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
