import {createSlice} from '@reduxjs/toolkit';
import {saveAuth, clearAuth} from '@utils/storage';

const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, {payload}) {
      state.user = payload.user;
      state.accessToken = payload.accessToken;
      state.refreshToken = payload.refreshToken;
      state.error = null;
      saveAuth(payload);
    },
    setUser(state, {payload}) {
      state.user = payload;
      saveAuth({
        user: payload,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      });
    },
    setTokens(state, {payload}) {
      state.accessToken = payload.accessToken;
      state.refreshToken = payload.refreshToken;
      saveAuth({
        user: state.user,
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
      });
    },
    setLoading(state, {payload}) {
      state.isLoading = payload;
    },
    setError(state, {payload}) {
      state.error = payload;
      state.isLoading = false;
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.error = null;
      clearAuth();
    },
  },
});

export const {setCredentials, setUser, setTokens, setLoading, setError, logout} =
  authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectUser = s => s.auth.user;
export const selectAccessToken = s => s.auth.accessToken;
export const selectRefreshToken = s => s.auth.refreshToken;
export const selectIsAuthenticated = s => Boolean(s.auth.accessToken && s.auth.user);
export const selectRole = s => s.auth.user?.role ?? null;
export const selectEmployeeId = s => s.auth.user?.employeeId ?? null;
export const selectOrganisationId = s => s.auth.user?.organisationId ?? null;
export const selectAuthLoading = s => s.auth.isLoading;
export const selectAuthError = s => s.auth.error;

// Permission selectors — mirrors web app logic exactly
// permissions: null = OWNER/ADMIN (full access), string[] = MANAGER/EMPLOYEE
export const selectHasPerm = perm => s => {
  const perms = s.auth.user?.permissions;
  if (perms === null || perms === undefined) return true;
  return Array.isArray(perms) && perms.includes(perm);
};

export const selectIsAdmin = s =>
  s.auth.user?.role === 'OWNER' || s.auth.user?.role === 'ADMIN';

export const selectCanManage = s =>
  ['OWNER', 'ADMIN', 'MANAGER'].includes(s.auth.user?.role);
