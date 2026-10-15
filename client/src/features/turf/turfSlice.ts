import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface TurfState {
  turfs: any[];
  loading: boolean;
  error: string | null;
}

const initialState: TurfState = {
  turfs: [],
  loading: false,
  error: null,
};

const turfSlice = createSlice({
  name: 'turf',
  initialState,
  reducers: {
    setTurfs: (state, action: PayloadAction<any[]>) => {
      state.turfs = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

// Unused actions removed
export default turfSlice.reducer;
