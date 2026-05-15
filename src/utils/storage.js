import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_KEY  = 'opw.auth';
const THEME_KEY = 'opw.theme';

export async function saveAuth(data) {
  try {
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(data));
  } catch (_) {}
}

export async function loadAuth() {
  try {
    const raw = await AsyncStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

export async function clearAuth() {
  try {
    await AsyncStorage.removeItem(AUTH_KEY);
  } catch (_) {}
}

export function saveTheme(theme) {
  AsyncStorage.setItem(THEME_KEY, theme).catch(() => {});
}

export async function loadTheme() {
  try {
    return (await AsyncStorage.getItem(THEME_KEY)) ?? 'system';
  } catch (_) {
    return 'system';
  }
}
