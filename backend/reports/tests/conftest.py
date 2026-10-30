from pathlib import Path

import pytest
from django.conf import settings
from openpyxl import load_workbook

from reports.parser import API_FIELDS, COLUMNS, NUMERIC_COLUMNS


@pytest.fixture
def sample_report_path() -> Path:
    """Реальный отчёт WB из docs/ (неделя 19–25.10.2026)."""
    files = sorted((Path(settings.BASE_DIR).parent / "docs").glob("*.xlsx"))
    assert files, "Нет образца отчёта в docs/"
    return files[0]


@pytest.fixture
def sample_api_rows(sample_report_path) -> list[dict]:
    """Строки образца в виде ответа WB API: поля из API_FIELDS, суммы — строками, как у WB."""
    sheet = load_workbook(sample_report_path, read_only=True).worksheets[0]
    sheet.reset_dimensions()
    rows = sheet.iter_rows(values_only=True)
    header = {title: index for index, title in enumerate(next(rows))}
    api_rows = []
    for rrd_id, row in enumerate(rows, start=1):
        if not any(cell not in (None, "") for cell in row):
            continue
        api_row = {
            "rrdId": rrd_id,
            "reportId": 883539431,
            "dateFrom": "2026-10-19",
            "dateTo": "2026-10-25",
        }
        for key, field in API_FIELDS.items():
            value = row[header[COLUMNS[key]]]
            money = key in NUMERIC_COLUMNS and key != "quantity"
            api_row[field] = str(value) if money else value
        api_row["paidStorage"] = str(row[header["Хранение"]])
        api_row["deduction"] = str(row[header["Удержания"]])
        api_rows.append(api_row)
    return api_rows
