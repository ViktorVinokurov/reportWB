"use client";

import { CalendarIcon } from "lucide-react";

import { formatIsoDate } from "@/shared/lib/format";
import { useAppDispatch, useAppSelector } from "@/shared/lib/store";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

import { allDatesShown, dateToggled, selectHiddenDates } from "../model/slice";

/** Меню дат графика с чекбоксами. Меню не закрывается при клике по пункту. */
export function ChartDatesMenu({ dates }: { dates: string[] }) {
  const dispatch = useAppDispatch();
  const hiddenDates = useAppSelector(selectHiddenDates);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarIcon /> Даты
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-96 w-56">
        <DropdownMenuLabel>Даты на графике</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {dates.map((date) => (
          <DropdownMenuCheckboxItem
            key={date}
            checked={!hiddenDates.includes(date)}
            onCheckedChange={() => dispatch(dateToggled(date))}
            onSelect={(event) => event.preventDefault()}
          >
            {formatIsoDate(date)}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(event) => (event.preventDefault(), dispatch(allDatesShown()))}>
          Показать все
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
