import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { MetricKey } from "@/entities/report";

interface TableColumnsState {
  hiddenColumns: MetricKey[];
}

const initialState: TableColumnsState = { hiddenColumns: [] };

export const tableColumnsSlice = createSlice({
  name: "tableColumns",
  initialState,
  reducers: {
    columnToggled(state, action: PayloadAction<MetricKey>) {
      const key = action.payload;
      state.hiddenColumns = state.hiddenColumns.includes(key)
        ? state.hiddenColumns.filter((k) => k !== key)
        : [...state.hiddenColumns, key];
    },
    allColumnsShown(state) {
      state.hiddenColumns = [];
    },
  },
  selectors: {
    selectHiddenColumns: (state) => state.hiddenColumns,
  },
});

export const { columnToggled, allColumnsShown } = tableColumnsSlice.actions;
export const { selectHiddenColumns } = tableColumnsSlice.selectors;
