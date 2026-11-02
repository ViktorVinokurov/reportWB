"""Публичные карточки товаров WB: цвет и фото по nmId, токен не нужен (см. docs/wb-api.md).

Это CDN витрины, а не официальный API. Номер хоста basket-NN зависит от nmId, и WB его
не публикует, поэтому хост ищется перебором. Найденное кешируется в ProductCard.
"""

import json
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from typing import Any, NamedTuple

# Сейчас отвечают хосты до basket-65, запас — на новые. Несуществующие не резолвятся по DNS.
MAX_BASKET = 80
WORKERS = 32
TIMEOUT = 3
# Если CDN недоступен, перебор всех хостов не должен затягивать ответ.
DEADLINE = 20


class WbCard(NamedTuple):
    color: str
    photo_url: str


def _get_json(url: str) -> dict[str, Any] | None:
    try:
        with urllib.request.urlopen(url, timeout=TIMEOUT) as response:
            return json.loads(response.read())
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None


def _card_base_url(nm_id: int, basket: int) -> str:
    return (
        f"https://basket-{basket:02d}.wbbasket.ru/vol{nm_id // 100_000}/part{nm_id // 1000}/{nm_id}"
    )


def fetch_cards(nm_ids: set[int]) -> dict[int, WbCard]:
    """Карточки по nmId. Те, что найти не удалось, в ответ не попадают."""
    cards: dict[int, WbCard] = {}
    deadline = time.monotonic() + DEADLINE

    def probe(nm_id: int, basket: int) -> None:
        if nm_id in cards or time.monotonic() > deadline:
            return
        base_url = _card_base_url(nm_id, basket)
        data = _get_json(f"{base_url}/info/ru/card.json")
        if data is None:
            return
        has_photo = data.get("media", {}).get("photo_count", 0) > 0
        cards[nm_id] = WbCard(
            color=data.get("nm_colors_names", ""),
            photo_url=f"{base_url}/images/c246x328/1.webp" if has_photo else "",
        )

    with ThreadPoolExecutor(WORKERS) as pool:
        for nm_id in nm_ids:
            for basket in range(1, MAX_BASKET + 1):
                pool.submit(probe, nm_id, basket)
    return cards
