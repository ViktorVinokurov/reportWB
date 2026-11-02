"""Парсер еженедельного детализированного отчёта Wildberries: файл .xlsx или строки WB API.

Колонки файла ищутся по тексту заголовка, а не по букве: WB меняет порядок колонок.
"""

import zipfile
from collections import defaultdict
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import IO, Any, NamedTuple

from openpyxl import load_workbook
from openpyxl.utils.exceptions import InvalidFileException

from .metrics import BaseTotals

COLUMNS = {
    "reason": "Обоснование для оплаты",  # K
    "quantity": "Кол-во",  # N
    "realized": "Вайлдберриз реализовал Товар (Пр)",  # P
    "payout": "К перечислению Продавцу за реализованный Товар",  # AH
    "logistics": "Услуги по доставке товара покупателю",  # AK
    "delivery_kind": "Виды доставок, штрафов и корректировок ВВ",  # AQ
    "name": "Название",  # G
    "nm_id": "Код номенклатуры",  # D
    "vendor_code": "Артикул поставщика",  # F
    "size": "Размер",  # H
}
# Те же колонки в строке детализации WB API (см. docs/wb-api.md).
API_FIELDS = {
    "reason": "sellerOperName",
    "quantity": "quantity",
    "realized": "retailAmount",
    "payout": "forPay",
    "logistics": "deliveryService",
    "delivery_kind": "bonusTypeName",
    "name": "title",
    "nm_id": "nmId",
    "vendor_code": "vendorCode",
    "size": "techSize",
}
NUMERIC_COLUMNS = ("quantity", "realized", "payout", "logistics")
# Поля API для расходов на весь отчёт: «Хранение» и «Удержания».
API_COST_FIELDS = ("paidStorage", "deduction")

SALE_REASON = "продажа"
ORDER_DELIVERY_KINDS = frozenset({"к клиенту при продаже", "к клиенту при отмене"})
# Удержание за рекламу: «Оказание услуг «WB Продвижение», документ №…»
ADVERTISING_KIND = "wb продвижение"


class ReportParseError(Exception):
    pass


@dataclass(frozen=True, slots=True)
class ReportCosts:
    """Хранение и реклама из отчёта WB — на весь отчёт, между названиями не делятся."""

    storage: Decimal = Decimal("0")
    advertising: Decimal = Decimal("0")


class Variant(NamedTuple):
    """Размер товара внутри карточки: одна карточка (nmId) — один цвет."""

    name: str
    nm_id: int
    vendor_code: str
    size: str


@dataclass(frozen=True, slots=True)
class ParsedReport:
    rows_count: int
    variants: dict[Variant, BaseTotals]

    @property
    def products(self) -> dict[str, BaseTotals]:
        products: dict[str, BaseTotals] = defaultdict(BaseTotals)
        for variant, totals in self.variants.items():
            products[variant.name] += totals
        return dict(products)

    @property
    def total(self) -> BaseTotals:
        return sum(self.variants.values(), BaseTotals())

    def __add__(self, other: "ParsedReport") -> "ParsedReport":
        """Объединяет части одного отчёта (WB делит большой отчёт на несколько файлов)."""
        variants = dict(self.variants)
        for variant, totals in other.variants.items():
            variants[variant] = variants.get(variant, BaseTotals()) + totals
        return ParsedReport(rows_count=self.rows_count + other.rows_count, variants=variants)


def _normalize(value: Any) -> str:
    return str(value).strip().casefold() if value is not None else ""


def _decimal(value: Any, where: str) -> Decimal:
    if value is None or value == "":
        return Decimal("0")
    if isinstance(value, int | float):
        return Decimal(str(value))
    try:
        return Decimal(str(value).replace("\xa0", "").replace(" ", "").replace(",", "."))
    except InvalidOperation as exc:
        raise ReportParseError(f"{where} содержит не число: {value!r}") from exc


def _add_row(
    variants: dict[Variant, BaseTotals], values: dict[str, Any], labels: dict[str, str], row: str
) -> None:
    """Добавляет одну строку отчёта (values — по ключам COLUMNS) к суммам её товара и размера."""
    amounts = {key: _decimal(values[key], f"{row}: «{labels[key]}»") for key in NUMERIC_COLUMNS}
    is_sale = _normalize(values["reason"]) == SALE_REASON
    is_order = _normalize(values["delivery_kind"]) in ORDER_DELIVERY_KINDS
    variant = Variant(
        name=str(values["name"] or "").strip(),
        nm_id=int(_decimal(values["nm_id"], f"{row}: «{labels['nm_id']}»")),
        vendor_code=str(values["vendor_code"] or "").strip(),
        size=str(values["size"] or "").strip(),
    )

    variants[variant] += BaseTotals(
        orders_qty=1 if is_order else 0,
        sales_qty=int(amounts["quantity"]) if is_sale else 0,
        sales_sum=amounts["payout"],
        logistics=amounts["logistics"],
        tax_base=amounts["realized"],
    )


def _column_indexes(header_row: tuple[Any, ...] | None) -> dict[str, int]:
    headers = {_normalize(cell): index for index, cell in enumerate(header_row or ())}
    missing = [title for title in COLUMNS.values() if _normalize(title) not in headers]
    if missing:
        raise ReportParseError("В файле нет колонок: " + ", ".join(f"«{m}»" for m in missing))
    return {key: headers[_normalize(title)] for key, title in COLUMNS.items()}


def parse_report(file: IO[bytes]) -> ParsedReport:
    try:
        workbook = load_workbook(file, read_only=True, data_only=True)
    except (InvalidFileException, zipfile.BadZipFile, KeyError, OSError) as exc:
        raise ReportParseError("Файл не является корректной книгой Excel (.xlsx)") from exc

    try:
        sheet = workbook.worksheets[0]
        # WB пишет в файл неверный размер листа (A1) — без сброса строки обрезаются.
        sheet.reset_dimensions()
        rows = sheet.iter_rows(values_only=True)
        columns = _column_indexes(next(rows, None))

        variants: dict[Variant, BaseTotals] = defaultdict(BaseTotals)
        rows_count = 0
        for row_number, row in enumerate(rows, start=2):
            if not any(cell not in (None, "") for cell in row):
                continue
            rows_count += 1

            values = {key: row[i] if i < len(row) else None for key, i in columns.items()}
            _add_row(variants, values, COLUMNS, f"Строка {row_number}")
    finally:
        workbook.close()

    if rows_count == 0:
        raise ReportParseError("В файле нет строк с данными")
    return ParsedReport(rows_count=rows_count, variants=dict(variants))


def parse_api_rows(rows: list[dict[str, Any]]) -> ParsedReport:
    """Строки детализации WB API — тот же результат, что parse_report даёт для файла."""
    variants: dict[Variant, BaseTotals] = defaultdict(BaseTotals)
    for row in rows:
        values = {key: row.get(field) for key, field in API_FIELDS.items()}
        _add_row(variants, values, API_FIELDS, f"Строка rrdId {row.get('rrdId')}")
    return ParsedReport(rows_count=len(rows), variants=dict(variants))


def parse_api_costs(rows: list[dict[str, Any]]) -> ReportCosts:
    """Хранение — Σ paidStorage («Стоимость хранения» в ЛК).

    Реклама — Σ deduction только по удержаниям «WB Продвижение»: остальные «Прочие
    удержания/выплаты» (подписки, утилизация и т. п.) рекламой не считаются.
    """
    storage = advertising = Decimal("0")
    for row in rows:
        row_label = f"Строка rrdId {row.get('rrdId')}"
        storage += _decimal(row.get("paidStorage"), f"{row_label}: «paidStorage»")
        if ADVERTISING_KIND in _normalize(row.get("bonusTypeName")):
            advertising += _decimal(row.get("deduction"), f"{row_label}: «deduction»")
    return ReportCosts(storage=storage, advertising=advertising)
