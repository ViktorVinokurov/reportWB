import { useGetOwnersQuery } from "@/entities/owner";
import { useAppSelector } from "@/shared/lib/store";

import { selectSelectedOwnerId } from "./slice";

/** ИП, чьи отчёты показываются: выбранный пользователем или первый в списке. */
export function useSelectedOwnerId(): string | undefined {
  const selectedOwnerId = useAppSelector(selectSelectedOwnerId);
  const { data: owners = [] } = useGetOwnersQuery();
  return owners.some((owner) => owner.id === selectedOwnerId)
    ? (selectedOwnerId ?? undefined)
    : owners[0]?.id;
}
