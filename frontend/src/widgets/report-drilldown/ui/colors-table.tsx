import { ImageOffIcon } from "lucide-react";
import { Fragment } from "react";

import {
  formatSize,
  type MetricDefinition,
  MetricCells,
  MetricHeads,
  type ProductCard,
  type ProductRow,
  useGetProductCardsQuery,
  useGetProductColorsQuery,
} from "@/entities/report";
import { getApiErrorMessage } from "@/shared/api";
import { cn } from "@/shared/lib/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/shared/ui/hover-card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";

import { stickyCell } from "./sticky-cell";

const photoBox = "h-12 w-9 shrink-0 rounded";

function ColorPhoto({ card, isLoading }: { card?: ProductCard; isLoading: boolean }) {
  if (isLoading) return <div className={cn(photoBox, "animate-pulse bg-muted")} />;
  if (!card?.photo_url) {
    return (
      <div className={cn(photoBox, "flex items-center justify-center bg-muted")}>
        <ImageOffIcon className="size-4 text-muted-foreground" />
      </div>
    );
  }
  // Фото WB уже нужных размеров и грузятся браузером напрямую: next/image здесь не нужен.
  /* eslint-disable @next/next/no-img-element */
  return (
    <HoverCard openDelay={100} closeDelay={0}>
      <HoverCardTrigger asChild>
        <img
          src={card.photo_url}
          alt={card.color}
          loading="lazy"
          className={cn(photoBox, "bg-muted object-cover")}
        />
      </HoverCardTrigger>
      {/* Портал: таблица обрезает всё, что выходит за её края. Большое фото грузится при наведении. */}
      <HoverCardContent
        side="right"
        align="start"
        collisionPadding={8}
        className="pointer-events-none w-auto p-1"
      >
        <img
          src={card.preview_url}
          alt={card.color}
          className="aspect-[3/4] w-64 rounded bg-muted object-cover"
        />
      </HoverCardContent>
    </HoverCard>
  );
  /* eslint-enable @next/next/no-img-element */
}

interface ColorsTableProps {
  ownerId: string;
  reportDate: string;
  position: ProductRow;
  columns: readonly MetricDefinition[];
  nmIds: number[] | null;
  sizes: string[] | null;
}

export function ColorsTable({
  ownerId,
  reportDate,
  position,
  columns,
  nmIds,
  sizes,
}: ColorsTableProps) {
  const query = { ownerId, reportDate, name: position.name };
  const {
    data: colors = [],
    isLoading,
    error,
  } = useGetProductColorsQuery({ ...query, nmIds, sizes });
  const {
    data: cards = [],
    isLoading: cardsLoading,
    error: cardsError,
  } = useGetProductCardsQuery(query);

  if (isLoading) return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  if (error) {
    return <p className="py-8 text-center text-muted-foreground">{getApiErrorMessage(error)}</p>;
  }
  if (colors.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        По этой позиции нет данных о цветах и размерах. Если отчёт был загружен раньше, чем появилась
        детализация, загрузите его заново.
      </p>
    );
  }

  return (
    <>
      {cardsError && (
        <p className="text-sm text-muted-foreground">{getApiErrorMessage(cardsError)}</p>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={stickyCell}>Цвет и размер</TableHead>
            <MetricHeads columns={columns} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {colors.map((color) => {
            const card = cards.find((item) => item.nm_id === color.nm_id);
            return (
              <Fragment key={color.nm_id}>
                <TableRow>
                  <TableCell className={stickyCell}>
                    <div className="flex items-center gap-3">
                      <ColorPhoto card={card} isLoading={cardsLoading} />
                      <div>
                        <div className="font-medium">{card?.color || "Цвет не указан"}</div>
                        <div className="text-xs text-muted-foreground">
                          {color.vendor_code} · {color.nm_id}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <MetricCells columns={columns} row={color} />
                </TableRow>
                {color.sizes.map((size) => (
                  <TableRow key={size.size} className="text-muted-foreground">
                    <TableCell className={cn(stickyCell, "pl-14")}>
                      {formatSize(size.size)}
                    </TableCell>
                    <MetricCells columns={columns} row={size} />
                  </TableRow>
                ))}
              </Fragment>
            );
          })}
        </TableBody>
        <TableFooter className="bg-card">
          <TableRow>
            <TableCell className={stickyCell}>Итого по позиции</TableCell>
            <MetricCells columns={columns} row={position} />
          </TableRow>
        </TableFooter>
      </Table>
    </>
  );
}
