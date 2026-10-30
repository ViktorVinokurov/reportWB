import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface OwnerSelectionState {
  /** null — пользователь ещё не выбирал ИП (берётся первый из списка). */
  selectedOwnerId: string | null;
}

const initialState: OwnerSelectionState = { selectedOwnerId: null };

export const ownerSelectionSlice = createSlice({
  name: "ownerSelection",
  initialState,
  reducers: {
    ownerSelected(state, action: PayloadAction<string>) {
      state.selectedOwnerId = action.payload;
    },
  },
  selectors: {
    selectSelectedOwnerId: (state) => state.selectedOwnerId,
  },
});

export const { ownerSelected } = ownerSelectionSlice.actions;
export const { selectSelectedOwnerId } = ownerSelectionSlice.selectors;
