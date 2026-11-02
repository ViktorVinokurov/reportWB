from datetime import date

from rest_framework import serializers

from .models import Owner, ProductCard


def _money(**kwargs) -> serializers.DecimalField:
    return serializers.DecimalField(max_digits=14, decimal_places=2, **kwargs)


class OwnerSerializer(serializers.ModelSerializer):
    # Сам токен наружу не отдаём — только признак, что он сохранён.
    has_token = serializers.SerializerMethodField()

    class Meta:
        model = Owner
        fields = ["id", "owner", "has_token"]

    def get_has_token(self, owner: Owner) -> bool:
        return bool(owner.token)


class OwnerTokenSerializer(serializers.ModelSerializer):
    token = serializers.CharField(write_only=True)

    class Meta:
        model = Owner
        fields = ["token"]

    def to_representation(self, instance: Owner) -> dict:
        return OwnerSerializer(instance).data


class OwnerQuerySerializer(serializers.Serializer):
    owner_id = serializers.UUIDField()


class ProductQuerySerializer(OwnerQuerySerializer):
    name = serializers.CharField()


class VariantFilterSerializer(serializers.Serializer):
    """Фильтр по цветам (nmId) и размерам. Нет параметра — нет фильтра."""

    nm_id = serializers.ListField(child=serializers.IntegerField(), required=False)
    size = serializers.ListField(child=serializers.CharField(allow_blank=True), required=False)


class ReportUploadSerializer(serializers.Serializer):
    owner_id = serializers.PrimaryKeyRelatedField(
        queryset=Owner.objects.all(), pk_field=serializers.UUIDField()
    )
    files = serializers.ListField(child=serializers.FileField(), allow_empty=False)
    report_date = serializers.DateField()
    advertising = _money(min_value=0)
    storage = _money(min_value=0)

    def validate_files(self, files):
        for file in files:
            if not file.name.lower().endswith(".xlsx"):
                raise serializers.ValidationError(f"{file.name}: нужен файл в формате .xlsx")
        return files


class WbImportWeekSerializer(serializers.Serializer):
    """Неделя отчёта WB — с понедельника date_from по воскресенье.

    Хранение всегда берётся из отчёта WB, реклама — тоже, если не передана.
    """

    date_from = serializers.DateField()
    advertising = _money(min_value=0, allow_null=True, default=None)

    def validate_date_from(self, value: date) -> date:
        if value.weekday() != 0:
            raise serializers.ValidationError("Неделя отчёта WB начинается с понедельника")
        return value


class WbImportSerializer(serializers.Serializer):
    owner_id = serializers.PrimaryKeyRelatedField(
        queryset=Owner.objects.all(), pk_field=serializers.UUIDField()
    )
    weeks = WbImportWeekSerializer(many=True, allow_empty=False)

    def validate_owner_id(self, owner: Owner) -> Owner:
        if not owner.token:
            raise serializers.ValidationError("Сохраните токен WB для этого ИП в настройках")
        return owner

    def validate_weeks(self, weeks: list[dict]) -> list[dict]:
        starts = [week["date_from"] for week in weeks]
        if len(set(starts)) != len(starts):
            raise serializers.ValidationError("Неделя выбрана дважды")
        return weeks


class SummaryRowSerializer(serializers.Serializer):
    report_date = serializers.DateField()
    orders_qty = serializers.IntegerField()
    sales_qty = serializers.IntegerField()
    sales_sum = _money()
    logistics = _money()
    advertising = _money()
    storage = _money()
    logistics_per_sale = _money(allow_null=True)
    advertising_per_sale = _money(allow_null=True)
    storage_per_sale = _money(allow_null=True)
    profit = _money()
    profit_without_ads = _money()
    profit_per_unit = _money(allow_null=True)
    profit_per_unit_without_ads = _money(allow_null=True)
    buyout_percent = _money(allow_null=True)
    tax_3 = _money(allow_null=True)
    tax_8 = _money(allow_null=True)
    tax_1 = _money(allow_null=True)


class PositionMetricsSerializer(SummaryRowSerializer):
    """Показатели позиции внутри отчёта: реклама и хранение на весь отчёт, у позиции их нет."""

    report_date = None
    advertising = _money(allow_null=True)
    storage = _money(allow_null=True)


class ProductRowSerializer(PositionMetricsSerializer):
    name = serializers.CharField()


class SizeRowSerializer(PositionMetricsSerializer):
    size = serializers.CharField()


class ColorRowSerializer(PositionMetricsSerializer):
    nm_id = serializers.IntegerField()
    vendor_code = serializers.CharField()
    sizes = SizeRowSerializer(many=True)


class FilterColorSerializer(serializers.Serializer):
    nm_id = serializers.IntegerField()
    vendor_code = serializers.CharField()
    sizes = serializers.ListField(child=serializers.CharField())


class ProductCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCard
        fields = ["nm_id", "color", "photo_url", "preview_url"]


class WbImportResultSerializer(serializers.Serializer):
    reports = SummaryRowSerializer(many=True)
    missing_weeks = serializers.ListField(
        child=serializers.DateField(), help_text="Понедельники недель, за которые у WB нет отчёта"
    )
