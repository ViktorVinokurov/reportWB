import { combineSlices, configureStore } from "@reduxjs/toolkit";

import { productFilterSlice } from "@/features/filter-by-product";
import { ownerSelectionSlice } from "@/features/select-owner";
import { chartDatesSlice } from "@/features/toggle-chart-dates";
import { chartSeriesSlice } from "@/features/toggle-chart-series";
import { tableColumnsSlice } from "@/features/toggle-table-columns";
import { baseApi } from "@/shared/api";

const rootReducer = combineSlices(
  baseApi,
  ownerSelectionSlice,
  productFilterSlice,
  tableColumnsSlice,
  chartSeriesSlice,
  chartDatesSlice,
);

/** Стор создаётся на каждый запрос/клиента, а не модульным синглтоном (рекомендация Redux для Next.js). */
export function makeStore() {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  });
}

declare global {
  type AppStore = ReturnType<typeof makeStore>;
  type RootState = ReturnType<typeof rootReducer>;
  type AppDispatch = AppStore["dispatch"];
}
