from decimal import Decimal

from reports.metrics import (
    REPORT_WIDE_FIELDS,
    SUMMARY_FIELDS,
    BaseTotals,
    compute_position_summary,
    compute_summary,
)


def test_compute_summary_formulas():
    base = BaseTotals(
        orders_qty=10,
        sales_qty=4,
        sales_sum=Decimal("1000"),
        logistics=Decimal("200"),
        tax_base=Decimal("1500"),
    )

    summary = compute_summary(base, advertising=Decimal("100"), storage=Decimal("50"))

    assert tuple(summary) == SUMMARY_FIELDS
    assert summary["logistics_per_sale"] == Decimal("50.00")
    assert summary["advertising_per_sale"] == Decimal("25.00")
    assert summary["storage_per_sale"] == Decimal("12.50")
    assert summary["profit"] == Decimal("650.00")
    assert summary["profit_without_ads"] == Decimal("750.00")
    assert summary["profit_per_unit"] == Decimal("162.50")
    assert summary["profit_per_unit_without_ads"] == Decimal("187.50")
    assert summary["buyout_percent"] == Decimal("40.00")
    # Σ P / Продажи (шт) × ставка = 1500 / 4 × ставка
    assert summary["tax_3"] == Decimal("11.25")
    assert summary["tax_8"] == Decimal("30.00")
    assert summary["tax_1"] == Decimal("3.75")


def test_compute_summary_without_sales_returns_none_ratios():
    summary = compute_summary(BaseTotals(), advertising=Decimal("100"), storage=Decimal("0"))

    for field in (
        "logistics_per_sale",
        "advertising_per_sale",
        "storage_per_sale",
        "profit_per_unit",
        "profit_per_unit_without_ads",
        "buyout_percent",
        "tax_3",
        "tax_8",
        "tax_1",
    ):
        assert summary[field] is None
    assert summary["profit"] == Decimal("-100.00")


def test_position_summary_has_no_ads_and_storage_and_counts_profit_before_them():
    base = BaseTotals(
        orders_qty=10,
        sales_qty=4,
        sales_sum=Decimal("1000"),
        logistics=Decimal("200"),
        tax_base=Decimal("1500"),
    )

    summary = compute_position_summary(base)

    assert tuple(summary) == SUMMARY_FIELDS
    assert all(summary[field] is None for field in REPORT_WIDE_FIELDS)
    assert summary["profit"] == Decimal("800.00")
    assert summary["profit_per_unit"] == Decimal("200.00")
    assert summary["logistics_per_sale"] == Decimal("50.00")
    assert summary["tax_3"] == Decimal("11.25")
