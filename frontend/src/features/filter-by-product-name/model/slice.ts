import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface ProductFilterState {
  /** null — выбраны все названия (без фильтра). */
  selectedNames: string[] | null;
}

const initialState: ProductFilterState = { selectedNames: null };

export const productFilterSlice = createSlice({
  name: "productFilter",
  initialState,
  reducers: {
    nameToggled(state, action: PayloadAction<{ name: string; allNames: string[] }>) {
      const { name, allNames } = action.payload;
      const current = state.selectedNames ?? allNames;
      const next = current.includes(name)
        ? current.filter((n) => n !== name)
        : [...current, name];
      const isAll = allNames.every((n) => next.includes(n));
      // Сортируем, чтобы одинаковый выбор давал один ключ кеша RTK Query.
      state.selectedNames = isAll ? null : next.sort();
    },
    allSelected(state) {
      state.selectedNames = null;
    },
    allCleared(state) {
      state.selectedNames = [];
    },
  },
  selectors: {
    selectSelectedNames: (state) => state.selectedNames,
  },
});

export const { nameToggled, allSelected, allCleared } = productFilterSlice.actions;
export const { selectSelectedNames } = productFilterSlice.selectors;
