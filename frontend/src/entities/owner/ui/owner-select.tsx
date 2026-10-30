"use client";

import { cn } from "@/shared/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

import { useGetOwnersQuery } from "../api/owner-api";

interface OwnerSelectProps {
  id?: string;
  value: string | undefined;
  onValueChange: (ownerId: string) => void;
  invalid?: boolean;
  className?: string;
}

export function OwnerSelect({ id, value, onValueChange, invalid, className }: OwnerSelectProps) {
  const { data: owners = [], isLoading } = useGetOwnersQuery();

  return (
    <Select value={value ?? ""} onValueChange={onValueChange} disabled={isLoading}>
      <SelectTrigger id={id} aria-invalid={invalid} className={cn("min-w-56", className)}>
        <SelectValue placeholder={owners.length === 0 ? "Нет ИП" : "Выберите ИП"} />
      </SelectTrigger>
      <SelectContent position="popper">
        {owners.map((owner) => (
          <SelectItem key={owner.id} value={owner.id}>
            {owner.owner}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
