import {configureStore} from '@reduxjs/toolkit';
import authReducer from '@features/auth/authSlice';
import uiReducer from '@features/ui/uiSlice';
import {apiSlice} from '@api/apiSlice';

// Import feature api files so their endpoints are injected before store mounts
import '@features/attendance/attendanceApi';
import '@features/leave/leaveApi';
import '@features/dashboard/dashboardApi';
import '@features/notifications/notificationsApi';
import '@features/admin/adminApi';
import '@features/profile/profileApi';

const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/setCredentials', 'auth/setTokens'],
      },
    }).concat(apiSlice.middleware),
});

export default store;
