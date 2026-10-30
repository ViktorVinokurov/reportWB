"use client";

import type { ReactNode } from "react";

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

import { METRICS } from "../model/metrics";
import type { MetricKey } from "../model/types";

interface MetricsMenuProps {
  trigger: ReactNode;
  title: string;
  isChecked: (key: MetricKey) => boolean;
  onToggle: (key: MetricKey) => void;
  onShowAll: () => void;
}

/** Выпадающий список метрик с чекбоксами. Меню не закрывается при клике по пункту. */
export function MetricsMenu({ trigger, title, isChecked, onToggle, onShowAll }: MetricsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {trigger}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-96 w-72">
        <DropdownMenuLabel>{title}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {METRICS.map((metric) => (
          <DropdownMenuCheckboxItem
            key={metric.key}
            checked={isChecked(metric.key)}
            onCheckedChange={() => onToggle(metric.key)}
            onSelect={(event) => event.preventDefault()}
          >
            {metric.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(event) => (event.preventDefault(), onShowAll())}>
          Показать все
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
