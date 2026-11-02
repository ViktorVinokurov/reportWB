import io
from decimal import Decimal

import pytest
from openpyxl import Workbook

from reports.parser import (
    ReportParseError,
    Variant,
    parse_api_costs,
    parse_api_rows,
    parse_report,
)


def _xlsx(rows: list[list]) -> io.BytesIO:
    workbook = Workbook()
    for row in rows:
        workbook.active.append(row)
    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    return buffer


HEADER = [
    "Название",
    "Обоснование для оплаты",
    "Кол-во",
    "Вайлдберриз реализовал Товар (Пр)",
    "К перечислению Продавцу за реализованный Товар",
    "Услуги по доставке товара покупателю",
    "Виды доставок, штрафов и корректировок ВВ",
    "Код номенклатуры",
    "Артикул поставщика",
    "Размер",
]


def test_parse_sample_report(sample_report_path):
    with sample_report_path.open("rb") as file:
        parsed = parse_report(file)

    assert parsed.rows_count == 529
    total = parsed.total
    assert total.orders_qty == 133
    assert total.sales_qty == 24
    assert total.sales_sum == Decimal("63416.48")
    assert total.logistics == Decimal("21455.56")
    assert total.tax_base == Decimal("77173")
    assert set(parsed.products) == {
        "",
        "Купальник раздельный на завязках",
        "Слитный купальник",
        "Плавки женские",
        "Лиф купальный",
    }


def test_parse_counts_orders_and_sales_by_rules():
    file = _xlsx(
        [
            HEADER,
            ["A", "Продажа", 2, 300, 250, 0, "К клиенту при продаже"],
            ["A", "Доставка", 0, 0, 0, 80, "К клиенту при отмене"],
            ["A", "Доставка", 0, 0, 0, 40, "От клиента при отмене"],
            # N=1 у возмещения издержек не считается продажей
            ["B", "Возмещение издержек по перемещению", 1, 0, 0, 0, None],
        ]
    )

    parsed = parse_report(file)

    assert parsed.products["A"].orders_qty == 2
    assert parsed.products["A"].sales_qty == 2
    assert parsed.products["A"].logistics == Decimal("120")
    assert parsed.products["B"].sales_qty == 0


def test_parse_finds_columns_by_header_not_position():
    reordered = list(reversed(HEADER))
    row = list(reversed(["A", "Продажа", 1, 100, 90, 0, "К клиенту при продаже", 7, "a-1", "S"]))

    parsed = parse_report(_xlsx([reordered, row]))

    assert parsed.total.sales_sum == Decimal("90")
    assert list(parsed.variants) == [Variant("A", 7, "a-1", "S")]


def test_parse_splits_one_name_by_color_and_size():
    file = _xlsx(
        [
            HEADER,
            ["A", "Продажа", 1, 100, 90, 0, "К клиенту при продаже", 1, " a-1 ", "S"],
            ["A", "Продажа", 1, 100, 90, 0, "К клиенту при продаже", 1, " a-1 ", "M"],
            ["A", "Продажа", 1, 100, 90, 0, "К клиенту при продаже", 1, " a-1 ", "M"],
            ["A", "Продажа", 1, 100, 90, 0, "К клиенту при продаже", 2, "a-2", "S"],
        ]
    )

    parsed = parse_report(file)

    assert {variant: totals.sales_qty for variant, totals in parsed.variants.items()} == {
        Variant("A", 1, "a-1", "S"): 1,
        Variant("A", 1, "a-1", "M"): 2,
        Variant("A", 2, "a-2", "S"): 1,
    }
    assert parsed.products["A"].sales_qty == 4


def test_parse_reports_missing_columns():
    with pytest.raises(ReportParseError, match="Кол-во"):
        parse_report(_xlsx([[h for h in HEADER if h != "Кол-во"], ["A"]]))


def test_parse_rejects_non_xlsx():
    with pytest.raises(ReportParseError, match="корректной книгой"):
        parse_report(io.BytesIO(b"not an excel file"))


def test_api_rows_give_same_report_as_file(sample_report_path, sample_api_rows):
    with sample_report_path.open("rb") as file:
        from_file = parse_report(file)

    assert parse_api_rows(sample_api_rows) == from_file


def test_api_rows_report_bad_number_with_rrd_id():
    row = {
        "rrdId": 7,
        "title": "A",
        "sellerOperName": "Продажа",
        "quantity": 1,
        "retailAmount": "abc",
        "forPay": "1",
        "deliveryService": "0",
        "bonusTypeName": "",
    }

    with pytest.raises(ReportParseError, match="rrdId 7: «retailAmount»"):
        parse_api_rows([row])


def test_api_costs_of_sample_match_seller_cabinet(sample_api_rows):
    # В ЛК за 19–25.10: «Стоимость хранения» 788.21, «Прочие удержания/выплаты» 12 975 —
    # одно удержание «Оказание услуг «WB Продвижение», документ №320795619».
    costs = parse_api_costs(sample_api_rows)

    assert costs.storage == Decimal("788.21")
    assert costs.advertising == Decimal("12975")


def test_api_costs_count_only_wb_promotion_deductions_as_advertising():
    rows = [
        {"bonusTypeName": "Оказание услуг «WB Продвижение», документ №1", "deduction": "100"},
        {"bonusTypeName": "Подписка «Джем»", "deduction": "40"},
        {"bonusTypeName": "", "paidStorage": "10.5", "deduction": "0"},
    ]

    costs = parse_api_costs(rows)

    assert costs.advertising == Decimal("100")
    assert costs.storage == Decimal("10.5")
