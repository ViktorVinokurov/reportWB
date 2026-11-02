import {
  formatProductName,
  type MetricDefinition,
  MetricCells,
  MetricHeads,
  type ProductRow,
  type SummaryRow,
} from "@/entities/report";
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

interface ProductsTableProps {
  products: ProductRow[];
  summary: SummaryRow;
  columns: readonly MetricDefinition[];
  onOpen: (name: string) => void;
}

export function ProductsTable({ products, summary, columns, onOpen }: ProductsTableProps) {
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={stickyCell}>Позиция</TableHead>
            <MetricHeads columns={columns} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) =>
            // Строка без названия — хранение, удержания, возмещения ПВЗ: цветов и размеров у неё нет.
            product.name ? (
              <TableRow
                key={product.name}
                className="cursor-pointer"
                onClick={() => onOpen(product.name)}
              >
                <TableCell className={stickyCell}>
                  {/* Клик всплывает к строке; кнопка нужна для фокуса с клавиатуры. */}
                  <button type="button" className="font-medium hover:underline">
                    {product.name}
                  </button>
                </TableCell>
                <MetricCells columns={columns} row={product} />
              </TableRow>
            ) : (
              <TableRow key="">
                <TableCell className={stickyCell}>{formatProductName(product.name)}</TableCell>
                <MetricCells columns={columns} row={product} />
              </TableRow>
            ),
          )}
        </TableBody>
        <TableFooter className="bg-card">
          <TableRow>
            <TableCell className={stickyCell}>Итого по отчёту</TableCell>
            <MetricCells columns={columns} row={summary} />
          </TableRow>
        </TableFooter>
      </Table>
      <p className="text-sm text-muted-foreground">
        Реклама и хранение считаются на весь отчёт и между позициями не делятся: прибыль позиции
        указана до них. Полная прибыль — в строке «Итого по отчёту».
      </p>
    </>
  );
}
