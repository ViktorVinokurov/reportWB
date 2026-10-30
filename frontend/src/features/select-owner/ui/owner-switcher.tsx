"use client";

import { OwnerSelect } from "@/entities/owner";
import { useAppDispatch } from "@/shared/lib/store";

import { ownerSelected } from "../model/slice";
import { useSelectedOwnerId } from "../model/use-selected-owner-id";

export function OwnerSwitcher({ onOwnerChange }: { onOwnerChange?: (ownerId: string) => void }) {
  const dispatch = useAppDispatch();
  const ownerId = useSelectedOwnerId();

  return (
    <OwnerSelect
      value={ownerId}
      onValueChange={(next) => {
        dispatch(ownerSelected(next));
        onOwnerChange?.(next);
      }}
    />
  );
}
