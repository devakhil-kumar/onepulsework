import axios from 'axios';
import {API} from '@constants/apiRoutes';

// Android emulator → 10.0.2.2, iOS simulator/physical iOS → localhost
// Physical Android device → MacBook's LAN IP (must be on same WiFi)
import {Platform} from 'react-native';
const DEV_URL = Platform.OS === 'android'
  ? 'http://192.168.29.100:4000'
  : 'http://localhost:4000';

// const BASE_URL = __DEV__ ? DEV_URL : 'https://onepulsework.com:4000';
const BASE_URL =  'https://onepulsework.com';
let _store = null;

export function injectStore(store) {
  _store = store;
}

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {'Content-Type': 'application/json'},
});

// Attach access token to every request
client.interceptors.request.use(config => {
  const token = _store?.getState()?.auth?.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
let _refreshing = false;
let _queue = [];

function processQueue(error, token = null) {
  _queue.forEach(p => (error ? p.reject(error) : p.resolve(token)));
  _queue = [];
}

client.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err);
    }
    original._retry = true;

    if (_refreshing) {
      return new Promise((resolve, reject) => {
        _queue.push({resolve, reject});
      }).then(token => {
        original.headers.Authorization = `Bearer ${token}`;
        return client(original);
      });
    }

    _refreshing = true;
    try {
      const refreshToken = _store?.getState()?.auth?.refreshToken;
      if (!refreshToken) throw new Error('No refresh token');

      const {data} = await axios.post(`${BASE_URL}${API.AUTH.REFRESH}`, {
        refreshToken,
      });
      const newAccessToken = data.data?.accessToken;
      const newRefreshToken = data.data?.refreshToken;

      // Update store
      const {setTokens} = await import('@features/auth/authSlice');
      _store.dispatch(setTokens({accessToken: newAccessToken, refreshToken: newRefreshToken}));

      processQueue(null, newAccessToken);
      original.headers.Authorization = `Bearer ${newAccessToken}`;
      return client(original);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      const {logout} = await import('@features/auth/authSlice');
      _store?.dispatch(logout());
      return Promise.reject(refreshErr);
    } finally {
      _refreshing = false;
    }
  },
);

export default client;
