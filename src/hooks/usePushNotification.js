/**
 * @file src/hooks/usePushNotification.js
 * @description FCM push notification registration + master toggle hook.
 *
 * AsyncStorage keys:
 *   cpw_fcm_token  — FCM token for this device
 *   cpw_push_on    — 'false' = user disabled push; else enabled
 */

import {useState, useEffect, useRef, useCallback} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform, Alert} from 'react-native';
import {
  registerFCMToken,
  unregisterFCMToken,
  setupForegroundHandler,
  setupBackgroundOpenedHandler,
  checkInitialNotification,
} from '../services/pushNotification';
import {
  useRegisterPushTokenMutation,
  useUnregisterPushTokenMutation,
} from '../features/notifications/notificationsApi';

const TOKEN_KEY  = 'cpw_fcm_token';
const PUSH_ON_KEY = 'cpw_push_on';

async function isPushEnabled() {
  const val = await AsyncStorage.getItem(PUSH_ON_KEY);
  return val !== 'false';
}

// ── Main hook: register on login, cleanup on logout ───────────────────────────
export function usePushNotification(isAuthenticated) {
  const [registerToken]   = useRegisterPushTokenMutation();
  const [unregisterToken] = useUnregisterPushTokenMutation();
  const unsubForeground   = useRef(null);
  const unsubBackground   = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    async function setup() {
      const enabled = await isPushEnabled();
      if (!enabled || cancelled) return;

      await registerFCMToken(async body => {
        if (body.token) {
          await AsyncStorage.setItem(TOKEN_KEY, body.token);
        }
        await registerToken(body).unwrap().catch(() => {});
      });

      if (!cancelled) {
        unsubForeground.current = setupForegroundHandler();
        unsubBackground.current = setupBackgroundOpenedHandler(null);
        await checkInitialNotification(null);
      }
    }

    setup();

    return () => {
      cancelled = true;
      unsubForeground.current?.();
      unsubBackground.current?.();
    };
  }, [isAuthenticated, registerToken]);

  const unregister = useCallback(async () => {
    unsubForeground.current?.();
    unsubBackground.current?.();
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return;
    await unregisterFCMToken(() => unregisterToken({token}).unwrap().catch(() => {}));
    await AsyncStorage.removeItem(TOKEN_KEY);
  }, [unregisterToken]);

  return {unregister};
}

// ── Lightweight hook for the Preferences screen ───────────────────────────────
export function usePushToggle() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [registerToken]   = useRegisterPushTokenMutation();
  const [unregisterToken] = useUnregisterPushTokenMutation();

  // Load stored preference on mount
  useEffect(() => {
    isPushEnabled().then(setPushEnabled);
  }, []);

  const toggle = useCallback(async (enable) => {
    if (enable) {
      await AsyncStorage.setItem(PUSH_ON_KEY, 'true');
      setPushEnabled(true);
      // Re-register token
      await registerFCMToken(async body => {
        if (body.token) await AsyncStorage.setItem(TOKEN_KEY, body.token);
        await registerToken(body).unwrap().catch(() => {});
      });
    } else {
      await AsyncStorage.setItem(PUSH_ON_KEY, 'false');
      setPushEnabled(false);
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        await unregisterToken({token}).unwrap().catch(() => {});
        await AsyncStorage.removeItem(TOKEN_KEY);
      }
    }
  }, [registerToken, unregisterToken]);

  return {pushEnabled, toggle};
}
