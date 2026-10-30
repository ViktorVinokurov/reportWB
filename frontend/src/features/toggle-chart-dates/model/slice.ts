import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface ChartDatesState {
  /** Скрытые даты (YYYY-MM-DD). Храним скрытые, а не видимые, чтобы новые отчёты сразу попадали на график. */
  hiddenDates: string[];
}

const initialState: ChartDatesState = { hiddenDates: [] };

export const chartDatesSlice = createSlice({
  name: "chartDates",
  initialState,
  reducers: {
    dateToggled(state, action: PayloadAction<string>) {
      const date = action.payload;
      state.hiddenDates = state.hiddenDates.includes(date)
        ? state.hiddenDates.filter((d) => d !== date)
        : [...state.hiddenDates, date];
    },
    allDatesShown(state) {
      state.hiddenDates = [];
    },
  },
  selectors: {
    selectHiddenDates: (state) => state.hiddenDates,
  },
});

export const { dateToggled, allDatesShown } = chartDatesSlice.actions;
export const { selectHiddenDates } = chartDatesSlice.selectors;
