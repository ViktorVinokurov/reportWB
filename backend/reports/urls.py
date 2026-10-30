from django.urls import path, register_converter

from .converters import IsoDateConverter
from .views import (
    OwnerListView,
    OwnerTokenView,
    ProductNamesView,
    ReportDetailView,
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
    path("reports/<isodate:report_date>", ReportDetailView.as_view(), name="report-detail"),
]
