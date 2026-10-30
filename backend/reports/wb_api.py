"""Клиент WB API: строки еженедельного отчёта о реализации (см. docs/wb-api.md)."""

import json
import time
import urllib.error
import urllib.request
from datetime import date
from typing import Any

from .parser import API_COST_FIELDS, API_FIELDS

DETAILED_URL = "https://finance-api.wildberries.ru/api/finance/v1/sales-reports/detailed"
PAGE_LIMIT = 100_000
# Лимит метода — 1 запрос в минуту на профиль продавца.
RATE_LIMIT_PAUSE = 60
TIMEOUT = 60
FIELDS = ["rrdId", "reportId", "dateFrom", "dateTo", *API_FIELDS.values(), *API_COST_FIELDS]

HTTP_ERRORS = {
    401: "WB не принял токен: он неверный или истёк. Замените его в настройках",
    403: "У токена нет доступа к отчётам: нужен токен категории «Финансы»",
    429: "WB отдаёт отчёты не чаще раза в минуту (по базовому токену — 2 раза в сутки). "
    "Повторите позже",
}


class WbApiError(Exception):
    pass


def _detail(exc: urllib.error.HTTPError) -> str:
    try:
        return json.loads(exc.read()).get("detail", "")
    except (ValueError, AttributeError):
        return ""


def _post(token: str, body: dict[str, Any]) -> list[dict[str, Any]]:
    request = urllib.request.Request(
        DETAILED_URL,
        data=json.dumps(body).encode(),
        method="POST",
        headers={"Authorization": token, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
            # 204 — строк больше нет
            return [] if response.status == 204 else json.loads(response.read())
    except urllib.error.HTTPError as exc:
        message = HTTP_ERRORS.get(exc.code) or f"WB API ответил {exc.code}: {_detail(exc)}"
        raise WbApiError(message) from exc
    except (urllib.error.URLError, TimeoutError) as exc:
        raise WbApiError("WB API недоступен, попробуйте позже") from exc


def fetch_weekly_rows(token: str, date_from: date, date_to: date) -> list[dict[str, Any]]:
    """Строки всех еженедельных отчётов за период date_from–date_to.

    Неделя строки — её поля dateFrom и dateTo. За неделю может быть несколько отчётов
    (основной и по выкупам), в период могут попасть и отчёты соседних недель.
    """
    rows: list[dict[str, Any]] = []
    rrd_id = 0
    while True:
        page = _post(
            token,
            {
                "dateFrom": date_from.isoformat(),
                "dateTo": date_to.isoformat(),
                "period": "weekly",
                "limit": PAGE_LIMIT,
                "rrdId": rrd_id,
                "fields": FIELDS,
            },
        )
        rows += page
        # Неполная страница — последняя: не ждём минуту ради ответа 204.
        if len(page) < PAGE_LIMIT:
            break
        rrd_id = page[-1]["rrdId"]
        time.sleep(RATE_LIMIT_PAUSE)
    return rows
