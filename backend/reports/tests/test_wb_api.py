import io
import json
import urllib.error
from datetime import date

import pytest

from reports import wb_api

WEEK = (date(2026, 10, 19), date(2026, 10, 25))


def _row(rrd_id: int, date_from: str = "2026-10-19", date_to: str = "2026-10-25") -> dict:
    return {"rrdId": rrd_id, "reportId": 1, "dateFrom": date_from, "dateTo": date_to}


def test_fetch_requests_weekly_period(monkeypatch):
    calls = []

    def fake_post(token, body):
        calls.append((token, body))
        return [_row(1), _row(2, "2026-10-12", "2026-10-18")]

    monkeypatch.setattr(wb_api, "_post", fake_post)

    rows = wb_api.fetch_weekly_rows("token", *WEEK)

    assert [row["rrdId"] for row in rows] == [1, 2]
    token, body = calls[0]
    assert token == "token"
    assert body["dateFrom"] == "2026-10-19"
    assert body["dateTo"] == "2026-10-25"
    assert body["period"] == "weekly"
    assert body["rrdId"] == 0
    assert "title" in body["fields"]
    # Неполная страница — единственный запрос.
    assert len(calls) == 1


def test_fetch_pages_by_rrd_id(monkeypatch):
    pages = iter([[_row(1), _row(2)], [_row(3)]])
    rrd_ids = []

    def fake_post(token, body):
        rrd_ids.append(body["rrdId"])
        return next(pages)

    monkeypatch.setattr(wb_api, "_post", fake_post)
    monkeypatch.setattr(wb_api, "PAGE_LIMIT", 2)
    monkeypatch.setattr(wb_api, "RATE_LIMIT_PAUSE", 0)

    rows = wb_api.fetch_weekly_rows("token", *WEEK)

    assert [row["rrdId"] for row in rows] == [1, 2, 3]
    assert rrd_ids == [0, 2]


@pytest.mark.parametrize(
    ("code", "message"), [(401, "не принял токен"), (429, "раза в минуту"), (500, "ответил 500")]
)
def test_post_turns_http_errors_into_messages(monkeypatch, code, message):
    def fake_urlopen(request, timeout):
        body = io.BytesIO(json.dumps({"detail": "boom"}).encode())
        raise urllib.error.HTTPError(request.full_url, code, "error", {}, body)

    monkeypatch.setattr(wb_api.urllib.request, "urlopen", fake_urlopen)

    with pytest.raises(wb_api.WbApiError, match=message):
        wb_api._post("token", {})
