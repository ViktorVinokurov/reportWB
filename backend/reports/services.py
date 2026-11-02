import logging
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID

from django.core.files.uploadedfile import UploadedFile
from django.db import transaction
from django.db.models import Sum

from . import wb_api, wb_cards
from .metrics import SUMMARY_FIELDS, BaseTotals, compute_position_summary, compute_summary
from .models import Owner, ProductCard, ProductMetrics, Report, VariantMetrics
from .parser import (
    ParsedReport,
    ReportParseError,
    parse_api_costs,
    parse_api_rows,
    parse_report,
)

logger = logging.getLogger(__name__)

BASE_FIELDS = ("orders_qty", "sales_qty", "sales_sum", "logistics", "tax_base")
# Неделя отчёта WB — с понедельника по воскресенье.
WEEK_END = timedelta(days=6)


def _parse_files(files: list[UploadedFile]) -> ParsedReport:
    parts = []
    for file in files:
        try:
            parts.append(parse_report(file))
        except ReportParseError as exc:
            raise ReportParseError(f"{file.name}: {exc}") from exc
    return sum(parts[1:], parts[0])


@transaction.atomic
def _save_parsed(
    *,
    owner: Owner,
    report_date: date,
    parsed: ParsedReport,
    source: str,
    advertising: Decimal,
    storage: Decimal,
) -> Report:
    """Сохраняет отчёт. Отчёт того же ИП на ту же дату перезаписывается."""
    total = parsed.total

    Report.objects.filter(owner=owner, report_date=report_date).delete()
    report = Report.objects.create(
        owner=owner,
        report_date=report_date,
        source_filename=source,
        rows_count=parsed.rows_count,
        tax_base=total.tax_base,
        **compute_summary(total, advertising, storage),
    )
    ProductMetrics.objects.bulk_create(
        ProductMetrics(report=report, name=name, **{f: getattr(totals, f) for f in BASE_FIELDS})
        for name, totals in parsed.products.items()
    )
    VariantMetrics.objects.bulk_create(
        VariantMetrics(
            report=report,
            name=variant.name,
            nm_id=variant.nm_id,
            vendor_code=variant.vendor_code,
            size=variant.size,
            **{f: getattr(totals, f) for f in BASE_FIELDS},
        )
        for variant, totals in parsed.variants.items()
        # Возмещения издержек, хранение и т. п.: строки без размера с нулевыми суммами.
        if totals != BaseTotals()
    )
    return report


def save_report(
    *,
    owner: Owner,
    report_date: date,
    files: list[UploadedFile],
    advertising: Decimal,
    storage: Decimal,
) -> Report:
    """Парсит файлы-части одного отчёта и сохраняет его."""
    return _save_parsed(
        owner=owner,
        report_date=report_date,
        parsed=_parse_files(files),
        source=", ".join(file.name for file in files),
        advertising=advertising,
        storage=storage,
    )


class ReportsNotFound(Exception):
    pass


def import_weekly_reports(*, owner: Owner, weeks: list[dict]) -> tuple[list[Report], list[date]]:
    """Загружает из WB API еженедельные отчёты за выбранные недели.

    weeks — [{date_from (понедельник), advertising}]. Все недели берутся одним запросом
    за период от первой до последней. Отчёт недели сохраняется на следующий день после неё:
    неделя 19–25.10 → дата 26.10. Хранение берётся из отчёта недели, реклама — тоже, если
    не введена вручную (advertising = None). Возвращает сохранённые отчёты и понедельники
    недель, за которые у WB отчёта нет. Запрос к WB идёт вне транзакции.
    """
    starts = [week["date_from"] for week in weeks]
    rows = wb_api.fetch_weekly_rows(owner.token, min(starts), max(starts) + WEEK_END)
    rows_by_week = defaultdict(list)
    for row in rows:
        rows_by_week[row["dateFrom"], row["dateTo"]].append(row)

    found, missing = [], []
    for week in weeks:
        date_from = week["date_from"]
        week_rows = rows_by_week.get((date_from.isoformat(), (date_from + WEEK_END).isoformat()))
        if week_rows:
            found.append((week, week_rows))
        else:
            missing.append(date_from)
    if not found:
        raise ReportsNotFound("В WB нет еженедельных отчётов за выбранные недели")

    reports = []
    with transaction.atomic():
        for week, week_rows in found:
            costs = parse_api_costs(week_rows)
            advertising = week.get("advertising")
            report_ids = sorted({row["reportId"] for row in week_rows})
            reports.append(
                _save_parsed(
                    owner=owner,
                    report_date=week["date_from"] + WEEK_END + timedelta(days=1),
                    parsed=parse_api_rows(week_rows),
                    source="WB API: " + ", ".join(f"отчёт №{i}" for i in report_ids),
                    advertising=costs.advertising if advertising is None else advertising,
                    storage=costs.storage,
                )
            )
    return reports, missing


def delete_report(owner_id: UUID, report_date: date) -> bool:
    """Удаляет отчёт ИП на дату вместе с показателями по названиям. False — отчёта не было."""
    deleted, _ = Report.objects.filter(owner_id=owner_id, report_date=report_date).delete()
    return deleted > 0


def build_summary(owner_id: UUID, names: list[str] | None) -> list[dict]:
    """Строки сводного отчёта ИП по датам.

    Без фильтра отдаём готовые строки из Report. С фильтром складываем суммы
    выбранных названий и пересчитываем показатели; реклама и хранение всегда
    берутся полностью — они вводятся на весь отчёт.
    """
    reports = Report.objects.filter(owner_id=owner_id)
    if names is None:
        return list(reports.values("report_date", *SUMMARY_FIELDS))

    totals_by_report = {
        row.pop("report_id"): BaseTotals(**row)
        for row in ProductMetrics.objects.filter(report__owner_id=owner_id, name__in=names)
        .values("report_id")
        .annotate(**{field: Sum(field) for field in BASE_FIELDS})
        .values("report_id", *BASE_FIELDS)
    }
    return [
        {
            "report_date": report.report_date,
            **compute_summary(
                totals_by_report.get(report.id, BaseTotals()), report.advertising, report.storage
            ),
        }
        for report in reports.only("id", "report_date", "advertising", "storage")
    ]


def product_rows(owner_id: UUID, report_date: date) -> list[dict]:
    """Позиции отчёта (значения «Названия»): больше продаж — выше, строка без названия — внизу."""
    products = ProductMetrics.objects.filter(
        report__owner_id=owner_id, report__report_date=report_date
    ).values("name", *BASE_FIELDS)
    rows = [
        {"name": row.pop("name"), **compute_position_summary(BaseTotals(**row))} for row in products
    ]
    return sorted(rows, key=lambda row: (not row["name"], -row["sales_sum"]))


def _variants(owner_id: UUID, report_date: date, name: str):
    return VariantMetrics.objects.filter(
        report__owner_id=owner_id, report__report_date=report_date, name=name
    )


def color_rows(owner_id: UUID, report_date: date, name: str) -> list[dict]:
    """Цвета позиции (карточки nmId), у каждого — строки по размерам."""
    colors = defaultdict(list)
    for variant in _variants(owner_id, report_date, name):
        colors[variant.nm_id].append(variant)

    rows = []
    for nm_id, variants in colors.items():
        sizes = defaultdict(BaseTotals)
        for variant in variants:
            sizes[variant.size] += BaseTotals(**{f: getattr(variant, f) for f in BASE_FIELDS})
        rows.append(
            {
                "nm_id": nm_id,
                "vendor_code": variants[0].vendor_code,
                **compute_position_summary(sum(sizes.values(), BaseTotals())),
                "sizes": [
                    {"size": size, **compute_position_summary(sizes[size])}
                    for size in sorted(sizes)
                ],
            }
        )
    return sorted(rows, key=lambda row: -row["sales_sum"])


def product_cards(owner_id: UUID, report_date: date, name: str) -> list[ProductCard]:
    """Цвет и фото цветов позиции. Чего нет в кеше, берём у WB; ненайденное спросим в другой раз."""
    nm_ids = set(
        _variants(owner_id, report_date, name).filter(nm_id__gt=0).values_list("nm_id", flat=True)
    )
    cards = list(ProductCard.objects.filter(nm_id__in=nm_ids))
    missing = nm_ids - {card.nm_id for card in cards}
    if not missing:
        return cards

    fetched = wb_cards.fetch_cards(missing)
    if not_found := missing - fetched.keys():
        logger.warning("Не найдены карточки WB: %s", sorted(not_found))
    new_cards = [
        ProductCard(nm_id=nm_id, color=card.color, photo_url=card.photo_url)
        for nm_id, card in fetched.items()
    ]
    # Ту же карточку мог одновременно сохранить параллельный запрос.
    ProductCard.objects.bulk_create(new_cards, ignore_conflicts=True)
    return cards + new_cards


def product_names(owner_id: UUID) -> list[str]:
    names = ProductMetrics.objects.filter(report__owner_id=owner_id).values_list("name", flat=True)
    # Сортируем в Python: порядок кириллицы в ORDER BY зависит от collation базы.
    return sorted(set(names))


def owners() -> list[Owner]:
    # Сортируем в Python по той же причине, что и названия.
    return sorted(Owner.objects.all(), key=lambda owner: owner.owner)
