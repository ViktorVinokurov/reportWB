from datetime import date
from uuid import UUID

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, status
from rest_framework.exceptions import APIException, NotFound, ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import Owner
from .parser import ReportParseError
from .serializers import (
    ColorRowSerializer,
    OwnerQuerySerializer,
    OwnerSerializer,
    OwnerTokenSerializer,
    ProductCardSerializer,
    ProductQuerySerializer,
    ProductRowSerializer,
    ReportUploadSerializer,
    SummaryRowSerializer,
    WbImportResultSerializer,
    WbImportSerializer,
)
from .wb_api import WbApiError


class WbApiFailed(APIException):
    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = "WB API вернул ошибку"


OWNER_PARAMETER = OpenApiParameter(
    "owner_id", OpenApiTypes.UUID, required=True, description="ИП, чьи отчёты нужны"
)
PRODUCT_PARAMETER = OpenApiParameter(
    "name", OpenApiTypes.STR, required=True, description="Позиция — значение колонки «Название»"
)


def _owner_id(request: Request) -> UUID:
    serializer = OwnerQuerySerializer(data=request.query_params)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data["owner_id"]


def _owner_and_product(request: Request) -> tuple[UUID, str]:
    serializer = ProductQuerySerializer(data=request.query_params)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data["owner_id"], serializer.validated_data["name"]


class OwnerListView(generics.ListCreateAPIView):
    serializer_class = OwnerSerializer

    def get_queryset(self):
        return services.owners()


class OwnerTokenView(generics.UpdateAPIView):
    """Сохраняет токен WB API для ИП. Ответ — ИП с признаком has_token."""

    serializer_class = OwnerTokenSerializer
    queryset = Owner.objects.all()
    http_method_names = ["patch"]

    @extend_schema(responses=OwnerSerializer)
    def patch(self, request: Request, *args, **kwargs) -> Response:
        return super().patch(request, *args, **kwargs)


class ReportUploadView(APIView):
    parser_classes = [MultiPartParser]

    @extend_schema(request=ReportUploadSerializer, responses={201: SummaryRowSerializer})
    def post(self, request: Request) -> Response:
        serializer = ReportUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            report = services.save_report(
                owner=data["owner_id"],
                report_date=data["report_date"],
                files=data["files"],
                advertising=data["advertising"],
                storage=data["storage"],
            )
        except ReportParseError as exc:
            raise ValidationError({"files": [str(exc)]}) from exc
        return Response(SummaryRowSerializer(report).data, status=status.HTTP_201_CREATED)


class WbImportView(APIView):
    """Загружает еженедельные отчёты за выбранные недели из WB API по токену ИП."""

    @extend_schema(
        request=WbImportSerializer,
        responses={201: WbImportResultSerializer, 404: None, 502: None},
    )
    def post(self, request: Request) -> Response:
        serializer = WbImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            reports, missing = services.import_weekly_reports(
                owner=data["owner_id"], weeks=data["weeks"]
            )
        except services.ReportsNotFound as exc:
            raise NotFound(str(exc)) from exc
        except (WbApiError, ReportParseError) as exc:
            raise WbApiFailed(str(exc)) from exc
        result = WbImportResultSerializer({"reports": reports, "missing_weeks": missing})
        return Response(result.data, status=status.HTTP_201_CREATED)


class ReportDetailView(APIView):
    @extend_schema(parameters=[OWNER_PARAMETER], responses={204: None, 404: None})
    def delete(self, request: Request, report_date: date) -> Response:
        if not services.delete_report(_owner_id(request), report_date):
            raise NotFound("Отчёт на эту дату не найден")
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReportProductsView(APIView):
    """Первый уровень детализации отчёта: позиции (значения «Названия»)."""

    @extend_schema(
        parameters=[OWNER_PARAMETER], responses={200: ProductRowSerializer(many=True), 404: None}
    )
    def get(self, request: Request, report_date: date) -> Response:
        rows = services.product_rows(_owner_id(request), report_date)
        if not rows:
            raise NotFound("Отчёт на эту дату не найден")
        return Response(ProductRowSerializer(rows, many=True).data)


class ReportColorsView(APIView):
    """Второй уровень детализации: цвета позиции и их размеры."""

    @extend_schema(
        parameters=[OWNER_PARAMETER, PRODUCT_PARAMETER], responses=ColorRowSerializer(many=True)
    )
    def get(self, request: Request, report_date: date) -> Response:
        owner_id, name = _owner_and_product(request)
        rows = services.color_rows(owner_id, report_date, name)
        return Response(ColorRowSerializer(rows, many=True).data)


class ReportCardsView(APIView):
    """Цвет и фото из карточек WB. Отдельный запрос: таблица не ждёт внешний CDN."""

    @extend_schema(
        parameters=[OWNER_PARAMETER, PRODUCT_PARAMETER], responses=ProductCardSerializer(many=True)
    )
    def get(self, request: Request, report_date: date) -> Response:
        owner_id, name = _owner_and_product(request)
        cards = services.product_cards(owner_id, report_date, name)
        return Response(ProductCardSerializer(cards, many=True).data)


class SummaryView(APIView):
    @extend_schema(
        parameters=[
            OWNER_PARAMETER,
            OpenApiParameter(
                "name",
                OpenApiTypes.STR,
                many=True,
                description="Фильтр по колонке «Название» (можно несколько). "
                "Без параметра — все названия.",
            ),
        ],
        responses=SummaryRowSerializer(many=True),
    )
    def get(self, request: Request) -> Response:
        owner_id = _owner_id(request)
        names = request.query_params.getlist("name") if "name" in request.query_params else None
        rows = services.build_summary(owner_id, names)
        return Response(SummaryRowSerializer(rows, many=True).data)


class ProductNamesView(APIView):
    @extend_schema(parameters=[OWNER_PARAMETER], responses=OpenApiTypes.STR)
    def get(self, request: Request) -> Response:
        return Response(services.product_names(_owner_id(request)))
