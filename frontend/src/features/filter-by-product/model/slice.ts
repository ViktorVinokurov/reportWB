import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** В каждом фильтре null — выбраны все значения (без фильтра). */
interface ProductFilterState {
  selectedNames: string[] | null;
  /** Цвет — карточка WB (nmId). */
  selectedColors: number[] | null;
  selectedSizes: string[] | null;
}

const initialState: ProductFilterState = {
  selectedNames: null,
  selectedColors: null,
  selectedSizes: null,
};

export const productFilterSlice = createSlice({
  name: "productFilter",
  initialState,
  reducers: {
    // Цвета зависят от названий, а размеры — от цветов: нижние фильтры сбрасываем на «все».
    namesChanged(state, action: PayloadAction<string[] | null>) {
      state.selectedNames = action.payload;
      state.selectedColors = null;
      state.selectedSizes = null;
    },
    colorsChanged(state, action: PayloadAction<number[] | null>) {
      state.selectedColors = action.payload;
      state.selectedSizes = null;
    },
    sizesChanged(state, action: PayloadAction<string[] | null>) {
      state.selectedSizes = action.payload;
    },
    filtersReset() {
      return initialState;
    },
  },
  selectors: {
    selectSelectedNames: (state) => state.selectedNames,
    selectSelectedColors: (state) => state.selectedColors,
    selectSelectedSizes: (state) => state.selectedSizes,
  },
});

export const { namesChanged, colorsChanged, sizesChanged, filtersReset } =
  productFilterSlice.actions;
export const { selectSelectedNames, selectSelectedColors, selectSelectedSizes } =
  productFilterSlice.selectors;
