"""Клиент WB API: строки еженедельного отчёта и карточки товаров (см. docs/wb-api.md)."""

import json
import time
import urllib.error
import urllib.request
from datetime import date
from typing import Any, NamedTuple

from .parser import API_COST_FIELDS, API_FIELDS

DETAILED_URL = "https://finance-api.wildberries.ru/api/finance/v1/sales-reports/detailed"
CARDS_URL = "https://content-api.wildberries.ru/content/v2/get/cards/list?locale=ru"
PAGE_LIMIT = 100_000
CARDS_PAGE_LIMIT = 100
# Лимит метода карточек — 100 запросов в минуту с интервалом 600 мс.
CARDS_PAUSE = 0.6
COLOR_CHARACTERISTIC = "Цвет"
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
CARDS_HTTP_ERRORS = {
    401: HTTP_ERRORS[401],
    403: "У токена нет доступа к карточкам товаров: нужна категория «Контент»",
    429: "WB временно ограничил запросы к карточкам товаров. Повторите позже",
}


class WbApiError(Exception):
    pass


class WbCard(NamedTuple):
    color: str
    photo_url: str


def _detail(exc: urllib.error.HTTPError) -> str:
    try:
        return json.loads(exc.read()).get("detail", "")
    except (ValueError, AttributeError):
        return ""


def _request(url: str, token: str, body: dict[str, Any], errors: dict[int, str]) -> Any:
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        method="POST",
        headers={"Authorization": token, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
            # 204 — данных больше нет
            return None if response.status == 204 else json.loads(response.read())
    except urllib.error.HTTPError as exc:
        message = errors.get(exc.code) or f"WB API ответил {exc.code}: {_detail(exc)}"
        raise WbApiError(message) from exc
    except (urllib.error.URLError, TimeoutError) as exc:
        raise WbApiError("WB API недоступен, попробуйте позже") from exc


def _post(token: str, body: dict[str, Any]) -> list[dict[str, Any]]:
    return _request(DETAILED_URL, token, body, HTTP_ERRORS) or []


def _post_cards(token: str, body: dict[str, Any]) -> dict[str, Any]:
    return _request(CARDS_URL, token, body, CARDS_HTTP_ERRORS)


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


def _parse_card(card: dict[str, Any]) -> WbCard:
    colors = next(
        (
            item["value"]
            for item in card.get("characteristics", [])
            if item["name"] == COLOR_CHARACTERISTIC
        ),
        [],
    )
    photos = card.get("photos", [])
    return WbCard(color=", ".join(colors), photo_url=photos[0]["tm"] if photos else "")


def fetch_cards(token: str) -> dict[int, WbCard]:
    """Цвет и фото всех карточек продавца по nmId. Карточки из корзины WB не отдаёт."""
    cards: dict[int, WbCard] = {}
    cursor: dict[str, Any] = {"limit": CARDS_PAGE_LIMIT}
    while True:
        page = _post_cards(
            token,
            {
                "settings": {
                    "sort": {"ascending": True},
                    "cursor": cursor,
                    "filter": {"withPhoto": -1},
                }
            },
        )
        for card in page["cards"]:
            cards[card["nmID"]] = _parse_card(card)
        # Неполная страница — последняя.
        if page["cursor"]["total"] < CARDS_PAGE_LIMIT:
            return cards
        cursor = {
            "limit": CARDS_PAGE_LIMIT,
            "updatedAt": page["cursor"]["updatedAt"],
            "nmID": page["cursor"]["nmID"],
        }
        time.sleep(CARDS_PAUSE)
