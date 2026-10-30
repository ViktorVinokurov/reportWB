from django.contrib import admin

from .models import Owner, ProductMetrics, Report


@admin.register(Owner)
class OwnerAdmin(admin.ModelAdmin):
    list_display = ("owner", "id")


class ProductMetricsInline(admin.TabularInline):
    model = ProductMetrics
    extra = 0
    can_delete = False
    readonly_fields = ("name", "orders_qty", "sales_qty", "sales_sum", "logistics", "tax_base")


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("report_date", "owner", "source_filename", "orders_qty", "sales_qty", "profit")
    list_filter = ("owner",)
    inlines = [ProductMetricsInline]
