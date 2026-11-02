"use client";

import { ChevronsUpDownIcon } from "lucide-react";
import { useId } from "react";

import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Separator } from "@/shared/ui/separator";

export interface FilterOption<T> {
  value: T;
  label: string;
  hint?: string;
}

interface CheckboxFilterProps<T> {
  title: string;
  /** Подпись кнопки, когда выбрано всё: «Все цвета». */
  allLabel: string;
  /** Подпись счётчика на кнопке: «Цвета: 2 из 5». */
  countLabel: string;
  emptyText: string;
  options: FilterOption<T>[];
  selected: T[] | null;
  disabled: boolean;
  notice?: string;
  onChange: (selected: T[] | null) => void;
  onOpenChange?: (open: boolean) => void;
}

export function CheckboxFilter<T extends string | number>({
  title,
  allLabel,
  countLabel,
  emptyText,
  options,
  selected,
  disabled,
  notice,
  onChange,
  onOpenChange,
}: CheckboxFilterProps<T>) {
  const id = useId();
  const isChecked = (value: T) => selected === null || selected.includes(value);

  const toggle = (value: T) => {
    const all = options.map((option) => option.value);
    const current = selected ?? all;
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    // Сортируем, чтобы одинаковый выбор давал один ключ кеша RTK Query.
    onChange(all.every((item) => next.includes(item)) ? null : next.sort());
  };

  return (
    <Popover onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="min-w-56 justify-between" disabled={disabled}>
          {selected === null
            ? allLabel
            : // Считаем по актуальному списку: после удаления отчёта в выборе могут остаться пропавшие значения.
              `${countLabel}: ${options.filter((option) => isChecked(option.value)).length} из ${options.length}`}
          <ChevronsUpDownIcon className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-medium">{title}</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="xs" onClick={() => onChange(null)}>
              Все
            </Button>
            <Button variant="ghost" size="xs" onClick={() => onChange([])}>
              Снять все
            </Button>
          </div>
        </div>
        <Separator />
        {notice && <p className="px-3 py-2 text-xs text-muted-foreground">{notice}</p>}
        <ul className="max-h-72 overflow-y-auto p-2">
          {options.length === 0 && (
            <li className="px-2 py-1.5 text-sm text-muted-foreground">{emptyText}</li>
          )}
          {options.map((option, index) => (
            <li
              key={option.value}
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent"
            >
              <Checkbox
                id={`${id}-${index}`}
                checked={isChecked(option.value)}
                onCheckedChange={() => toggle(option.value)}
              />
              <Label htmlFor={`${id}-${index}`} className="flex-1 cursor-pointer font-normal">
                {option.label}
                {option.hint && (
                  <span className="ml-auto text-xs text-muted-foreground">{option.hint}</span>
                )}
              </Label>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
