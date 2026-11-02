"""Формулы сводного отчёта. Единственное место, где они описаны (см. docs/project.md)."""

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

ZERO = Decimal("0")
CENT = Decimal("0.01")

TAX_RATES = {"tax_3": Decimal("0.03"), "tax_8": Decimal("0.08"), "tax_1": Decimal("0.01")}

# Порядок полей строки сводного отчёта (без даты) — совпадает с колонками таблицы.
SUMMARY_FIELDS = (
    "orders_qty",
    "sales_qty",
    "sales_sum",
    "logistics",
    "advertising",
    "storage",
    "logistics_per_sale",
    "advertising_per_sale",
    "storage_per_sale",
    "profit",
    "profit_without_ads",
    "profit_per_unit",
    "profit_per_unit_without_ads",
    "buyout_percent",
    "tax_3",
    "tax_8",
    "tax_1",
)
# Реклама и хранение считаются на весь отчёт: у отдельной позиции этих показателей нет.
REPORT_WIDE_FIELDS = ("advertising", "storage", "advertising_per_sale", "storage_per_sale")


@dataclass(frozen=True, slots=True)
class BaseTotals:
    """Аддитивные суммы, из которых считаются все показатели."""

    orders_qty: int = 0
    sales_qty: int = 0
    sales_sum: Decimal = ZERO
    logistics: Decimal = ZERO
    tax_base: Decimal = ZERO

    def __add__(self, other: "BaseTotals") -> "BaseTotals":
        return BaseTotals(
            orders_qty=self.orders_qty + other.orders_qty,
            sales_qty=self.sales_qty + other.sales_qty,
            sales_sum=self.sales_sum + other.sales_sum,
            logistics=self.logistics + other.logistics,
            tax_base=self.tax_base + other.tax_base,
        )


def _round(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def _per(numerator: Decimal, denominator: int) -> Decimal | None:
    return _round(numerator / denominator) if denominator else None


def compute_summary(
    base: BaseTotals, advertising: Decimal, storage: Decimal
) -> dict[str, int | Decimal | None]:
    """Строит строку сводного отчёта. Деление на ноль даёт None."""
    sales_qty = base.sales_qty
    profit = base.sales_sum - base.logistics - advertising - storage
    profit_without_ads = base.sales_sum - base.logistics - storage
    buyout = _round(Decimal(sales_qty) / base.orders_qty * 100) if base.orders_qty else None

    summary: dict[str, int | Decimal | None] = {
        "orders_qty": base.orders_qty,
        "sales_qty": sales_qty,
        "sales_sum": _round(base.sales_sum),
        "logistics": _round(base.logistics),
        "advertising": _round(advertising),
        "storage": _round(storage),
        "logistics_per_sale": _per(base.logistics, sales_qty),
        "advertising_per_sale": _per(advertising, sales_qty),
        "storage_per_sale": _per(storage, sales_qty),
        "profit": _round(profit),
        "profit_without_ads": _round(profit_without_ads),
        "profit_per_unit": _per(profit, sales_qty),
        "profit_per_unit_without_ads": _per(profit_without_ads, sales_qty),
        "buyout_percent": buyout,
    }
    # Налог на 1 продажу: Σ P / Продажи (шт) × ставка
    summary.update(
        {field: _per(base.tax_base * rate, sales_qty) for field, rate in TAX_RATES.items()}
    )
    return summary


def compute_position_summary(base: BaseTotals) -> dict[str, int | Decimal | None]:
    """Строка позиции внутри отчёта. Реклама и хранение не делятся, прибыль считается до них."""
    return {**compute_summary(base, ZERO, ZERO), **dict.fromkeys(REPORT_WIDE_FIELDS)}
