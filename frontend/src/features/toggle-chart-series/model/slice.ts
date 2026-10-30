import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { METRICS, type MetricKey } from "@/entities/report";

interface ChartSeriesState {
  visibleSeries: MetricKey[];
}

const initialState: ChartSeriesState = {
  visibleSeries: ["sales_sum", "logistics", "profit"],
};

export const chartSeriesSlice = createSlice({
  name: "chartSeries",
  initialState,
  reducers: {
    seriesToggled(state, action: PayloadAction<MetricKey>) {
      const key = action.payload;
      state.visibleSeries = state.visibleSeries.includes(key)
        ? state.visibleSeries.filter((k) => k !== key)
        : [...state.visibleSeries, key];
    },
    allSeriesShown(state) {
      state.visibleSeries = METRICS.map((metric) => metric.key);
    },
  },
  selectors: {
    selectVisibleSeries: (state) => state.visibleSeries,
  },
});

export const { seriesToggled, allSeriesShown } = chartSeriesSlice.actions;
export const { selectVisibleSeries } = chartSeriesSlice.selectors;
