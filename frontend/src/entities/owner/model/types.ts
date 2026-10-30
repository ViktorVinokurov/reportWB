/** ИП — владелец отчётов (GET /api/owners). */
export interface Owner {
  id: string;
  owner: string;
  /** Сохранён ли токен WB API. Сам токен API не отдаёт. */
  has_token: boolean;
}
