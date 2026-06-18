/**
 * @file src/services/pushNotification.js
 * @description Firebase Cloud Messaging setup for iOS + Android.
 *
 * SETUP REQUIRED:
 *  Android → place google-services.json in android/app/
 *  iOS     → place GoogleService-Info.plist in ios/onepulsework/
 *            then run: cd ios && pod install
 *
 * Until Firebase config files are in place, all functions are silent no-ops.
 */

import messaging from '@react-native-firebase/messaging';
import {Platform, DeviceEventEmitter, PermissionsAndroid} from 'react-native';

export const FCM_FOREGROUND_EVENT = 'FCM_FOREGROUND_MSG';

/** FCM token stored in memory for the session. */
let _fcmToken = null;

/**
 * Returns the Firebase Messaging instance, or null if Firebase is not yet
 * initialised (e.g. config files missing during early development).
 */
function getMsg() {
  try {
    return messaging();
  } catch {
    return null;
  }
}

/**
 * Request push notification permission (iOS shows a system dialog).
 * @returns {Promise<boolean>}
 */
async function requestPermission() {
  const msg = getMsg();
  if (!msg) return false;

  // Android 13+ requires POST_NOTIFICATIONS runtime permission
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (result !== PermissionsAndroid.RESULTS.GRANTED) return false;
  }

  const authStatus = await msg.requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

/**
 * Get the FCM token and register it with the backend.
 * Safe to call on every app start — backend upserts by token value.
 */
export async function registerFCMToken(registerTokenFn) {
  const msg = getMsg();
  if (!msg) {
    console.warn('[FCM] Firebase not initialised — skipping token registration');
    return;
  }
  try {
    const granted = await requestPermission();
    if (!granted) return;

    // iOS: ensure the device is registered with APNs and Firebase has the APNs
    // token BEFORE asking for an FCM token — otherwise getToken() throws
    // "No APNS token specified before fetching FCM Token" and push never works.
    if (Platform.OS === 'ios') {
      try {
        if (!msg.isDeviceRegisteredForRemoteMessages) {
          await msg.registerDeviceForRemoteMessages();
        }
        await msg.getAPNSToken();
      } catch (e) {
        console.warn('[FCM] iOS APNs registration issue:', e?.message);
      }
    }

    _fcmToken = await msg.getToken();
    if (!_fcmToken) return;

    await registerTokenFn({
      token: _fcmToken,
      platform: Platform.OS,
      device: Platform.OS === 'ios' ? 'iPhone' : 'Android',
    });

    // When FCM refreshes the token, re-register automatically
    msg.onTokenRefresh(async newToken => {
      _fcmToken = newToken;
      await registerTokenFn({token: newToken, platform: Platform.OS});
    });
  } catch (err) {
    console.warn('[FCM] registerFCMToken failed:', err?.message);
  }
}

/**
 * Unregister FCM token from the backend on logout.
 */
export async function unregisterFCMToken(unregisterTokenFn) {
  if (!_fcmToken) return;
  try {
    await unregisterTokenFn({token: _fcmToken});
    _fcmToken = null;
  } catch {}
}

/**
 * Set up foreground notification handler — shows an Alert when the app is open.
 * Returns an unsubscribe function (or no-op if Firebase is not ready).
 */
export function setupForegroundHandler() {
  const msg = getMsg();
  if (!msg) return () => {};
  try {
    return msg.onMessage(async remoteMessage => {
      DeviceEventEmitter.emit(FCM_FOREGROUND_EVENT, {
        title: remoteMessage.notification?.title ?? 'New notification',
        body:  remoteMessage.notification?.body  ?? '',
      });
    });
  } catch (err) {
    console.warn('[FCM] setupForegroundHandler failed:', err?.message);
    return () => {};
  }
}

/**
 * Handle notification taps when the app is in background (not fully quit).
 * Returns an unsubscribe function (or no-op if Firebase is not ready).
 */
export function setupBackgroundOpenedHandler(onOpen) {
  const msg = getMsg();
  if (!msg) return () => {};
  try {
    return msg.onNotificationOpenedApp(remoteMessage => {
      if (onOpen) onOpen(remoteMessage);
    });
  } catch (err) {
    console.warn('[FCM] setupBackgroundOpenedHandler failed:', err?.message);
    return () => {};
  }
}

/**
 * Check if the app was launched by tapping a notification (quit state).
 */
export async function checkInitialNotification(onOpen) {
  const msg = getMsg();
  if (!msg) return;
  try {
    const remoteMessage = await msg.getInitialNotification();
    if (remoteMessage && onOpen) onOpen(remoteMessage);
  } catch (err) {
    console.warn('[FCM] checkInitialNotification failed:', err?.message);
  }
}
