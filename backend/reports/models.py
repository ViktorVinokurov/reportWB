import uuid

from django.db import models


def money(verbose_name: str, *, null: bool = False) -> models.DecimalField:
    return models.DecimalField(verbose_name, max_digits=14, decimal_places=2, null=null)


class Owner(models.Model):
    """ИП — владелец отчётов."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.CharField(
        "ИП", max_length=255, unique=True, error_messages={"unique": "Такой ИП уже есть"}
    )
    token = models.TextField("Токен WB API", blank=True, default="")

    class Meta:
        verbose_name = "ИП"
        verbose_name_plural = "ИП"

    def __str__(self) -> str:
        return self.owner


class Report(models.Model):
    """Отчёт ИП на одну дату (из одного или нескольких файлов-частей).

    Хранит готовую строку сводного отчёта.
    """

    owner = models.ForeignKey(
        Owner, on_delete=models.PROTECT, related_name="reports", verbose_name="ИП"
    )
    report_date = models.DateField("Дата отчёта")
    source_filename = models.TextField("Имена файлов")
    rows_count = models.PositiveIntegerField("Строк в файлах")
    uploaded_at = models.DateTimeField("Загружен", auto_now=True)

    # Аддитивные суммы по всему файлу
    orders_qty = models.IntegerField("Заказы, шт")
    sales_qty = models.IntegerField("Продажи, шт")
    sales_sum = money("Продажи, сумма")
    logistics = money("Логистика")
    tax_base = money("Сумма «Вайлдберриз реализовал Товар (Пр)»")

    # Ввод пользователя при загрузке
    advertising = money("Реклама")
    storage = money("Хранение")

    # Производные показатели (см. reports/metrics.py)
    logistics_per_sale = money("Л на 1 продажу", null=True)
    advertising_per_sale = money("Р на 1 продажу", null=True)
    storage_per_sale = money("Х на 1 продажу", null=True)
    profit = money("Прибыль на р.счёт")
    profit_without_ads = money("Прибыль без учёта рекламы")
    profit_per_unit = money("Прибыль на 1 шт", null=True)
    profit_per_unit_without_ads = money("Прибыль на 1 шт без учёта рекламы", null=True)
    buyout_percent = money("% выкупа", null=True)
    tax_3 = money("Налог 3% на 1 продажу", null=True)
    tax_8 = money("Налог 8% на 1 продажу", null=True)
    tax_1 = money("Налог 1% на 1 продажу", null=True)

    class Meta:
        ordering = ["report_date"]
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "report_date"], name="unique_owner_report_date"
            ),
        ]
        verbose_name = "Отчёт"
        verbose_name_plural = "Отчёты"

    def __str__(self) -> str:
        return f"Отчёт {self.owner} на {self.report_date:%d.%m.%Y}"


class ProductMetrics(models.Model):
    """Аддитивные суммы по одному значению колонки «Название» внутри отчёта.

    Нужны для фильтра по названиям: суммы складываются, а производные
    показатели пересчитываются из них на лету.
    """

    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name="products")
    name = models.CharField("Название", max_length=500, blank=True)
    orders_qty = models.IntegerField("Заказы, шт")
    sales_qty = models.IntegerField("Продажи, шт")
    sales_sum = money("Продажи, сумма")
    logistics = money("Логистика")
    tax_base = money("Сумма «Вайлдберриз реализовал Товар (Пр)»")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["report", "name"], name="unique_report_product_name"),
        ]
        verbose_name = "Показатели по названию"
        verbose_name_plural = "Показатели по названиям"

    def __str__(self) -> str:
        return f"{self.name or '(без названия)'} — {self.report}"


class VariantMetrics(models.Model):
    """Аддитивные суммы по размеру внутри карточки (nmId = цвет). Детализация «Названия»."""

    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name="variants")
    name = models.CharField("Название", max_length=500, blank=True)
    nm_id = models.BigIntegerField("Код номенклатуры")
    vendor_code = models.CharField("Артикул поставщика", max_length=255, blank=True)
    size = models.CharField("Размер", max_length=100, blank=True)
    orders_qty = models.IntegerField("Заказы, шт")
    sales_qty = models.IntegerField("Продажи, шт")
    sales_sum = money("Продажи, сумма")
    logistics = money("Логистика")
    tax_base = money("Сумма «Вайлдберриз реализовал Товар (Пр)»")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["report", "name", "nm_id", "vendor_code", "size"],
                name="unique_report_variant",
            ),
        ]
        verbose_name = "Показатели по размеру"
        verbose_name_plural = "Показатели по размерам"

    def __str__(self) -> str:
        return f"{self.nm_id} {self.size} — {self.report}"


class ProductCard(models.Model):
    """Цвет и фото карточки WB. Кеш публичных данных витрины, общий для всех ИП."""

    nm_id = models.BigIntegerField("Код номенклатуры", primary_key=True)
    color = models.CharField("Цвет", max_length=255, blank=True)
    photo_url = models.URLField("Фото", blank=True)

    class Meta:
        verbose_name = "Карточка товара"
        verbose_name_plural = "Карточки товаров"

    def __str__(self) -> str:
        return f"{self.nm_id} {self.color}"
