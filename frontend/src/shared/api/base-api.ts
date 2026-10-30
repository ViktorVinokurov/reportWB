import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

/** Общий RTK Query API. Эндпоинты добавляют слайсы через injectEndpoints. */
export const baseApi = createApi({
  reducerPath: "api",
  // /api проксируется на Django через rewrites в next.config.ts
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Summary", "ProductNames", "Owners"],
  endpoints: () => ({}),
});
