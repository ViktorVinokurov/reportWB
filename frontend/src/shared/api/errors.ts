import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";

type ApiError = FetchBaseQueryError | SerializedError | undefined;

/** Ошибки валидации DRF: { field: ["сообщение", ...] }. */
export function getApiFieldErrors(error: ApiError): Record<string, string> {
  if (!error || !("status" in error) || typeof error.data !== "object" || !error.data) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(error.data as Record<string, unknown>).map(([field, messages]) => [
      field,
      Array.isArray(messages) ? messages.join(" ") : String(messages),
    ]),
  );
}

export function getApiErrorMessage(error: ApiError): string {
  if (!error) return "";
  if ("status" in error && error.status === "FETCH_ERROR") {
    return "Сервер недоступен. Проверьте, что бэкенд запущен.";
  }
  const fieldErrors = Object.values(getApiFieldErrors(error));
  return fieldErrors[0] ?? "Что-то пошло не так. Попробуйте ещё раз.";
}
