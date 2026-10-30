from datetime import date


class IsoDateConverter:
    """Дата в URL в формате YYYY-MM-DD. Несуществующая дата (2026-13-40) даёт 404."""

    regex = r"\d{4}-\d{2}-\d{2}"

    def to_python(self, value: str) -> date:
        return date.fromisoformat(value)

    def to_url(self, value: date) -> str:
        return value.isoformat()
