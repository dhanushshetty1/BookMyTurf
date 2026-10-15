import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import turfReducer from '../features/turf/turfSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    turf: turfReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;

