from decimal import Decimal

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from reports import wb_api
from reports.models import Owner, ProductCard, ProductMetrics, Report, VariantMetrics

pytestmark = pytest.mark.django_db


@pytest.fixture
def client() -> APIClient:
    return APIClient()


@pytest.fixture
def owner() -> Owner:
    return Owner.objects.create(owner="ИП Иванов")


@pytest.fixture
def other_owner() -> Owner:
    return Owner.objects.create(owner="ИП Петров")


def upload(client, owner, *paths, report_date="2026-10-25", advertising="1000", storage="500"):
    files = [SimpleUploadedFile(path.name, path.read_bytes()) for path in paths]
    return client.post(
        "/api/reports",
        {
            "owner_id": str(owner.id),
            "files": files,
            "report_date": report_date,
            "advertising": advertising,
            "storage": storage,
        },
        format="multipart",
    )


def summary(client, owner, **params):
    return client.get("/api/reports/summary", {"owner_id": str(owner.id), **params})


def test_create_and_list_owners(client):
    response = client.post("/api/owners", {"owner": "  ИП Сидоров  "}, format="json")
    assert response.status_code == 201, response.data
    assert response.json()["owner"] == "ИП Сидоров"

    client.post("/api/owners", {"owner": "ИП Абрамов"}, format="json")

    assert [o["owner"] for o in client.get("/api/owners").json()] == ["ИП Абрамов", "ИП Сидоров"]


@pytest.mark.parametrize("name", ["", "ИП Иванов"])
def test_create_owner_rejects_blank_and_duplicate(client, owner, name):
    response = client.post("/api/owners", {"owner": name}, format="json")

    assert response.status_code == 400
    assert "owner" in response.json()


def test_set_owner_token_saves_it_and_hides_value(client, owner):
    assert client.get("/api/owners").json()[0]["has_token"] is False

    url = f"/api/owners/{owner.id}/token"
    response = client.patch(url, {"token": "  abc.def  "}, format="json")

    assert response.status_code == 200, response.data
    assert response.json() == {"id": str(owner.id), "owner": "ИП Иванов", "has_token": True}
    owner.refresh_from_db()
    assert owner.token == "abc.def"
    assert client.get("/api/owners").json() == [response.json()]


def test_set_owner_token_rejects_blank(client, owner):
    response = client.patch(f"/api/owners/{owner.id}/token", {"token": " "}, format="json")

    assert response.status_code == 400
    assert "token" in response.json()


def test_set_token_for_unknown_owner_returns_404(client):
    response = client.patch(f"/api/owners/{Owner().id}/token", {"token": "abc"}, format="json")

    assert response.status_code == 404


def wb_week(date_from="2026-10-19", **advertising):
    return {"date_from": date_from, **advertising}


def wb_import(client, owner, *weeks):
    body = {"owner_id": str(owner.id), "weeks": list(weeks) or [wb_week()]}
    return client.post("/api/reports/wb-import", body, format="json")


@pytest.fixture
def owner_with_token(owner) -> Owner:
    owner.token = "wb-token"
    owner.save()
    return owner


def test_wb_import_saves_week_on_next_day_like_file(
    client, owner_with_token, sample_report_path, sample_api_rows, monkeypatch
):
    monkeypatch.setattr(wb_api, "_post", lambda token, body: sample_api_rows)

    response = wb_import(client, owner_with_token)

    assert response.status_code == 201, response.data
    result = response.json()
    assert result["missing_weeks"] == []
    [row] = result["reports"]
    # Неделя 19–25.10 → отчёт на 26.10; показатели — как при загрузке файла этой недели
    # с рекламой и хранением из ЛК: «Прочие удержания» 12 975, «Стоимость хранения» 788.21.
    assert row["report_date"] == "2026-10-26"
    assert row["advertising"] == 12975
    assert row["storage"] == 788.21
    expected = upload(
        client, owner_with_token, sample_report_path, advertising="12975", storage="788.21"
    ).json()
    assert row == {**expected, "report_date": "2026-10-26"}

    report = Report.objects.get(report_date="2026-10-26")
    assert report.source_filename == "WB API: отчёт №883539431"
    assert report.rows_count == 529
    assert report.products.count() == 5


def test_wb_import_loads_selected_weeks_with_one_request(
    client, owner_with_token, sample_api_rows, monkeypatch
):
    # Те же строки ещё и как отчёт недели 05–11.10; за 12–18.10 у WB отчёта нет.
    earlier = [
        {**row, "reportId": 1, "dateFrom": "2026-10-05", "dateTo": "2026-10-11"}
        for row in sample_api_rows
    ]
    requests = []

    def fake_post(token, body):
        requests.append(body)
        return sample_api_rows + earlier

    monkeypatch.setattr(wb_api, "_post", fake_post)

    response = wb_import(
        client,
        owner_with_token,
        wb_week("2026-10-19", advertising="1000"),
        wb_week("2026-10-12"),
        wb_week("2026-10-05", advertising=None),
    )

    assert response.status_code == 201, response.data
    result = response.json()
    assert result["missing_weeks"] == ["2026-10-12"]
    assert [row["report_date"] for row in result["reports"]] == ["2026-10-26", "2026-10-12"]
    # Реклама: введённая вручную заменяет удержания «WB Продвижение»; пустая — из отчёта.
    assert [row["advertising"] for row in result["reports"]] == [1000, 12975]
    assert [row["storage"] for row in result["reports"]] == [788.21, 788.21]
    # Один запрос за весь период от первой до последней недели.
    assert [(body["dateFrom"], body["dateTo"]) for body in requests] == [
        ("2026-10-05", "2026-10-25")
    ]
    assert Report.objects.get(report_date="2026-10-12").source_filename == "WB API: отчёт №1"


def test_wb_import_joins_week_split_at_month_boundary(
    client, owner_with_token, sample_api_rows, monkeypatch
):
    # На стыке месяцев WB делит неделю 26.10–01.11 на отчёты 26–31.10 и 01–01.11.
    october = [
        {**row, "reportId": 1, "dateFrom": "2026-10-26", "dateTo": "2026-10-31"}
        for row in sample_api_rows
    ]
    november = [
        {**row, "reportId": 2, "dateFrom": "2026-11-01", "dateTo": "2026-11-01"}
        for row in sample_api_rows
    ]
    monkeypatch.setattr(wb_api, "_post", lambda token, body: october + november)

    response = wb_import(client, owner_with_token, wb_week("2026-10-26"))

    assert response.status_code == 201, response.data
    result = response.json()
    assert result["missing_weeks"] == []
    [row] = result["reports"]
    assert row["report_date"] == "2026-11-02"
    # Обе части складываются в один отчёт недели.
    assert row["orders_qty"] == 2 * 133
    assert row["storage"] == 2 * 788.21
    assert row["advertising"] == 2 * 12975
    report = Report.objects.get()
    assert report.rows_count == 2 * 529
    assert report.source_filename == "WB API: отчёт №1, отчёт №2"


def test_wb_import_ignores_neighbour_week_with_split_report(
    client, owner_with_token, sample_api_rows, monkeypatch
):
    # Запрос за 19.10–01.11 вернул и часть следующей недели, но отмечена только 19–25.10.
    november = [
        {**row, "reportId": 2, "dateFrom": "2026-11-01", "dateTo": "2026-11-01"}
        for row in sample_api_rows
    ]
    monkeypatch.setattr(wb_api, "_post", lambda token, body: sample_api_rows + november)

    response = wb_import(client, owner_with_token, wb_week("2026-10-19"))

    assert response.status_code == 201, response.data
    assert response.json()["reports"][0]["orders_qty"] == 133


@pytest.mark.parametrize(
    "weeks",
    [
        [],
        [wb_week("2026-10-20")],  # не понедельник
        [wb_week("2026-10-19"), wb_week("2026-10-19")],  # неделя дважды
    ],
)
def test_wb_import_validates_weeks(client, owner_with_token, weeks):
    body = {"owner_id": str(owner_with_token.id), "weeks": weeks}
    response = client.post("/api/reports/wb-import", body, format="json")

    assert response.status_code == 400
    assert "weeks" in response.json()


def test_wb_import_requires_owner_token(client, owner):
    response = wb_import(client, owner)

    assert response.status_code == 400
    assert "токен" in response.json()["owner_id"][0]


def test_wb_import_without_reports_for_selected_weeks_returns_404(
    client, owner_with_token, monkeypatch
):
    monkeypatch.setattr(wb_api, "_post", lambda token, body: [])

    response = wb_import(client, owner_with_token)

    assert response.status_code == 404
    assert Report.objects.count() == 0


def test_wb_import_wb_error_returns_502(client, owner_with_token, monkeypatch):
    def fail(token, body):
        raise wb_api.WbApiError("WB не принял токен")

    monkeypatch.setattr(wb_api, "_post", fail)

    response = wb_import(client, owner_with_token)

    assert response.status_code == 502
    assert response.json() == {"detail": "WB не принял токен"}


def test_upload_saves_precomputed_summary(client, owner, sample_report_path):
    response = upload(client, owner, sample_report_path)

    assert response.status_code == 201, response.data
    row = response.json()
    assert row["report_date"] == "2026-10-25"
    assert row["orders_qty"] == 133
    assert row["sales_qty"] == 24
    assert row["sales_sum"] == 63416.48
    assert row["logistics"] == 21455.56
    assert row["profit"] == 40460.92
    assert row["profit_without_ads"] == 41460.92
    assert row["profit_per_unit"] == 1685.87
    assert row["logistics_per_sale"] == 893.98
    assert row["buyout_percent"] == 18.05
    # 77 173 / 24 × ставка
    assert row["tax_3"] == 96.47
    assert row["tax_8"] == 257.24
    assert row["tax_1"] == 32.16

    report = Report.objects.get()
    assert report.owner == owner
    assert report.products.count() == 5


def test_upload_merges_file_parts_into_one_report(client, owner, sample_report_path):
    # Две одинаковые части — суммы удваиваются, отчёт и названия остаются в одном экземпляре.
    response = upload(client, owner, sample_report_path, sample_report_path)

    assert response.status_code == 201, response.data
    row = response.json()
    assert row["orders_qty"] == 266
    assert row["sales_qty"] == 48
    assert row["sales_sum"] == 126832.96
    # Реклама и хранение вводятся на весь отчёт и не удваиваются.
    assert row["profit"] == round(126832.96 - 2 * 21455.56 - 1000 - 500, 2)

    report = Report.objects.get()
    assert report.rows_count == 2 * 529
    assert report.source_filename == f"{sample_report_path.name}, {sample_report_path.name}"
    assert report.products.count() == 5


def test_upload_same_owner_and_date_overwrites(client, owner, sample_report_path):
    upload(client, owner, sample_report_path, advertising="1000")
    upload(client, owner, sample_report_path, advertising="2000")

    assert Report.objects.count() == 1
    assert Report.objects.get().advertising == Decimal("2000")


def test_upload_same_date_for_different_owners_keeps_both(
    client, owner, other_owner, sample_report_path
):
    upload(client, owner, sample_report_path, advertising="1000")
    upload(client, other_owner, sample_report_path, advertising="2000")

    assert Report.objects.count() == 2
    assert summary(client, owner).json()[0]["advertising"] == 1000
    assert summary(client, other_owner).json()[0]["advertising"] == 2000


def test_upload_rejects_invalid_file_and_names_it(client, owner, sample_report_path):
    good = SimpleUploadedFile(sample_report_path.name, sample_report_path.read_bytes())
    broken = SimpleUploadedFile("part-2.xlsx", b"broken")
    response = client.post(
        "/api/reports",
        {
            "owner_id": str(owner.id),
            "files": [good, broken],
            "report_date": "2026-10-25",
            "advertising": "0",
            "storage": "0",
        },
        format="multipart",
    )

    assert response.status_code == 400
    assert response.json()["files"][0].startswith("part-2.xlsx:")
    assert Report.objects.count() == 0


def test_upload_requires_fields(client):
    response = client.post("/api/reports", {}, format="multipart")

    assert response.status_code == 400
    assert set(response.json()) == {"owner_id", "files", "report_date", "advertising", "storage"}


def test_upload_rejects_unknown_owner(client, sample_report_path):
    response = upload(client, Owner(), sample_report_path)

    assert response.status_code == 400
    assert "owner_id" in response.json()


def test_delete_report_removes_date_and_its_products(client, owner, sample_report_path):
    upload(client, owner, sample_report_path, report_date="2026-10-25")
    upload(client, owner, sample_report_path, report_date="2026-10-18")

    response = client.delete(f"/api/reports/2026-10-25?owner_id={owner.id}")

    assert response.status_code == 204
    assert [r["report_date"] for r in summary(client, owner).json()] == ["2026-10-18"]
    assert ProductMetrics.objects.filter(report__report_date="2026-10-25").count() == 0


def test_delete_report_keeps_other_owner_report(client, owner, other_owner, sample_report_path):
    upload(client, owner, sample_report_path)
    upload(client, other_owner, sample_report_path)

    client.delete(f"/api/reports/2026-10-25?owner_id={owner.id}")

    assert summary(client, owner).json() == []
    assert len(summary(client, other_owner).json()) == 1


def test_delete_last_report_clears_product_names(client, owner, sample_report_path):
    upload(client, owner, sample_report_path)

    client.delete(f"/api/reports/2026-10-25?owner_id={owner.id}")

    names = client.get("/api/reports/product-names", {"owner_id": str(owner.id)}).json()
    assert names == []


@pytest.mark.parametrize("report_date", ["2026-10-25", "2026-13-40"])
def test_delete_missing_report_returns_404(client, owner, report_date):
    response = client.delete(f"/api/reports/{report_date}?owner_id={owner.id}")

    assert response.status_code == 404


@pytest.mark.parametrize(
    "url",
    [
        "/api/reports/summary",
        "/api/reports/product-names",
        "/api/reports/2026-10-25",
        "/api/reports/2026-10-25/products",
        "/api/reports/2026-10-25/colors",
        "/api/reports/2026-10-25/cards",
    ],
)
@pytest.mark.parametrize("query", ["", "?owner_id=not-a-uuid"])
def test_owner_id_is_required(client, url, query):
    method = client.delete if url.endswith("2026-10-25") else client.get
    response = method(url + query)

    assert response.status_code == 400
    assert "owner_id" in response.json()


def test_summary_without_filter_returns_stored_rows(client, owner, sample_report_path):
    upload(client, owner, sample_report_path, report_date="2026-10-25")
    upload(client, owner, sample_report_path, report_date="2026-10-18")

    rows = summary(client, owner).json()

    assert [r["report_date"] for r in rows] == ["2026-10-18", "2026-10-25"]
    assert rows[0]["orders_qty"] == 133


def test_summary_and_names_are_scoped_by_owner(client, owner, other_owner, sample_report_path):
    upload(client, owner, sample_report_path)

    assert summary(client, other_owner).json() == []
    assert summary(client, other_owner, name=["Слитный купальник"]).json() == []
    names = client.get("/api/reports/product-names", {"owner_id": str(other_owner.id)}).json()
    assert names == []


def test_summary_filter_by_names_keeps_full_ads_and_storage(client, owner, sample_report_path):
    upload(client, owner, sample_report_path)
    names = client.get("/api/reports/product-names", {"owner_id": str(owner.id)}).json()
    assert "Слитный купальник" in names

    all_names = summary(client, owner, name=names).json()[0]
    unfiltered = summary(client, owner).json()[0]
    assert all_names == unfiltered

    one = summary(client, owner, name=["Слитный купальник"]).json()[0]
    assert one["sales_qty"] < unfiltered["sales_qty"]
    assert one["advertising"] == 1000
    assert one["storage"] == 500
    assert one["profit"] == round(one["sales_sum"] - one["logistics"] - 1000 - 500, 2)


SWIMSUIT = "Слитный купальник"
REPORT_WIDE = ("advertising", "storage", "advertising_per_sale", "storage_per_sale")


def report_part(client, owner, part, **params):
    url = f"/api/reports/2026-10-25/{part}"
    return client.get(url, {"owner_id": str(owner.id), **params})


def test_products_add_up_to_report_without_ads_and_storage(client, owner, sample_report_path):
    upload(client, owner, sample_report_path)

    rows = report_part(client, owner, "products").json()

    total = summary(client, owner).json()[0]
    for field in ("orders_qty", "sales_qty"):
        assert sum(row[field] for row in rows) == total[field]
    for field in ("sales_sum", "logistics"):
        assert round(sum(row[field] for row in rows), 2) == total[field]
    # Прибыль позиций до рекламы и хранения: вместе с ними сходится с прибылью отчёта.
    assert round(sum(row["profit"] for row in rows) - 1000 - 500, 2) == total["profit"]
    assert all(row[field] is None for row in rows for field in REPORT_WIDE)

    # Больше продаж — выше, строка без названия — внизу.
    sums = [row["sales_sum"] for row in rows[:-1]]
    assert sums == sorted(sums, reverse=True)
    assert rows[-1]["name"] == ""


def test_products_of_missing_report_return_404(client, owner):
    assert report_part(client, owner, "products").status_code == 404


def test_colors_split_position_by_nm_id_and_size(client, owner, sample_report_path):
    upload(client, owner, sample_report_path)

    colors = report_part(client, owner, "colors", name=SWIMSUIT).json()

    position = next(
        row for row in report_part(client, owner, "products").json() if row["name"] == SWIMSUIT
    )
    assert {color["nm_id"] for color in colors} == {
        578832269,
        578842131,
        668553020,
        846318855,
        846318856,
    }
    assert sum(color["orders_qty"] for color in colors) == position["orders_qty"]
    assert sum(color["sales_qty"] for color in colors) == position["sales_qty"]
    assert round(sum(color["sales_sum"] for color in colors), 2) == position["sales_sum"]
    assert round(sum(color["logistics"] for color in colors), 2) == position["logistics"]

    black = next(color for color in colors if color["nm_id"] == 578842131)
    assert black["vendor_code"] == "слитный-черный"
    assert [size["size"] for size in black["sizes"]] == ["M-L", "XS-S"]
    assert sum(size["logistics"] for size in black["sizes"]) == pytest.approx(black["logistics"])
    assert all(black[field] is None for field in REPORT_WIDE)


def test_colors_are_scoped_by_owner(client, owner, other_owner, sample_report_path):
    upload(client, owner, sample_report_path)

    assert report_part(client, other_owner, "colors", name=SWIMSUIT).json() == []


def test_reupload_replaces_variants(client, owner, sample_report_path):
    upload(client, owner, sample_report_path)
    count = VariantMetrics.objects.count()

    upload(client, owner, sample_report_path)

    assert VariantMetrics.objects.count() == count


def test_cards_are_fetched_once_and_cached(
    client, owner_with_token, sample_report_path, monkeypatch
):
    upload(client, owner_with_token, sample_report_path)
    requests = []

    def fake_fetch(token):
        requests.append(token)
        # Весь каталог продавца: кроме цветов этой позиции есть и чужие.
        return {
            578842131: wb_api.WbCard("черный", "https://cdn/578842131.webp"),
            846318855: wb_api.WbCard("красный", ""),
            1: wb_api.WbCard("синий", "https://cdn/1.webp"),
        }

    monkeypatch.setattr(wb_api, "fetch_cards", fake_fetch)

    first = report_part(client, owner_with_token, "cards", name=SWIMSUIT).json()

    assert requests == ["wb-token"]
    assert {card["nm_id"] for card in first} == {578842131, 846318855}
    assert {"nm_id": 578842131, "color": "черный", "photo_url": "https://cdn/578842131.webp"} in (
        first
    )
    # Остальной каталог тоже закеширован.
    assert ProductCard.objects.filter(nm_id=1).exists()

    # Трёх цветов позиции в каталоге нет: их спросим снова, найденные остаются из кеша.
    second = report_part(client, owner_with_token, "cards", name=SWIMSUIT).json()
    assert len(requests) == 2
    assert {card["nm_id"] for card in second} == {578842131, 846318855}


def test_cards_do_not_call_wb_when_all_are_cached(
    client, owner_with_token, sample_report_path, monkeypatch
):
    upload(client, owner_with_token, sample_report_path)
    nm_ids = (578832269, 578842131, 668553020, 846318855, 846318856)
    ProductCard.objects.bulk_create(ProductCard(nm_id=nm_id, color="черный") for nm_id in nm_ids)

    def fail(token):
        raise AssertionError("Всё уже в кеше")

    monkeypatch.setattr(wb_api, "fetch_cards", fail)

    response = report_part(client, owner_with_token, "cards", name=SWIMSUIT)

    assert response.status_code == 200
    assert len(response.json()) == 5


def test_cards_without_token_ask_to_save_it(client, owner, sample_report_path):
    upload(client, owner, sample_report_path)

    response = report_part(client, owner, "cards", name=SWIMSUIT)

    assert response.status_code == 400
    assert "токен" in response.json()["owner_id"][0]


def test_cards_wb_error_returns_502(client, owner_with_token, sample_report_path, monkeypatch):
    upload(client, owner_with_token, sample_report_path)

    def fail(token, body):
        raise wb_api.WbApiError("У токена нет доступа к карточкам товаров")

    monkeypatch.setattr(wb_api, "_post_cards", fail)

    response = report_part(client, owner_with_token, "cards", name=SWIMSUIT)

    assert response.status_code == 502
    assert response.json() == {"detail": "У токена нет доступа к карточкам товаров"}
