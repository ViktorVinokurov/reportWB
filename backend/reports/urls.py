from django.urls import path, register_converter

from .converters import IsoDateConverter
from .views import (
    FilterCardsView,
    FilterColorsView,
    OwnerListView,
    OwnerTokenView,
    ProductNamesView,
    ReportCardsView,
    ReportColorsView,
    ReportDetailView,
    ReportProductsView,
    ReportUploadView,
    SummaryView,
    WbImportView,
)

register_converter(IsoDateConverter, "isodate")

# Без завершающего слеша: фронтенд проксирует /api через Next.js, а Next
# по умолчанию убирает слеш в конце URL.
urlpatterns = [
    path("owners", OwnerListView.as_view(), name="owner-list"),
    path("owners/<uuid:pk>/token", OwnerTokenView.as_view(), name="owner-token"),
    path("reports", ReportUploadView.as_view(), name="report-upload"),
    path("reports/wb-import", WbImportView.as_view(), name="report-wb-import"),
    path("reports/summary", SummaryView.as_view(), name="report-summary"),
    path("reports/product-names", ProductNamesView.as_view(), name="report-product-names"),
    path("reports/filter-colors", FilterColorsView.as_view(), name="report-filter-colors"),
    path("reports/filter-cards", FilterCardsView.as_view(), name="report-filter-cards"),
    path("reports/<isodate:report_date>", ReportDetailView.as_view(), name="report-detail"),
    path(
        "reports/<isodate:report_date>/products",
        ReportProductsView.as_view(),
        name="report-products",
    ),
    path("reports/<isodate:report_date>/colors", ReportColorsView.as_view(), name="report-colors"),
    path("reports/<isodate:report_date>/cards", ReportCardsView.as_view(), name="report-cards"),
]
