import { configureStore } from "@reduxjs/toolkit";
import { applicationApi } from "./api/service";

export const store = configureStore({
  reducer: {
    [applicationApi.reducerPath]: applicationApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(applicationApi.middleware),
});
