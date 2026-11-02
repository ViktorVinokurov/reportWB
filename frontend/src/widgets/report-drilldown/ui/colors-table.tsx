import { ImageOffIcon } from "lucide-react";
import { Fragment } from "react";

import {
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
  return (
    // Фото отдаёт CDN WB напрямую в браузер: оптимизатор next/image здесь не нужен.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={card.photo_url}
      alt={card.color}
      loading="lazy"
      className={cn(photoBox, "bg-muted object-cover")}
    />
  );
}

interface ColorsTableProps {
  ownerId: string;
  reportDate: string;
  position: ProductRow;
  columns: readonly MetricDefinition[];
}

export function ColorsTable({ ownerId, reportDate, position, columns }: ColorsTableProps) {
  const query = { ownerId, reportDate, name: position.name };
  const { data: colors = [], isLoading, error } = useGetProductColorsQuery(query);
  const { data: cards = [], isLoading: cardsLoading } = useGetProductCardsQuery(query);

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
                    {size.size || "(без размера)"}
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
  );
}
