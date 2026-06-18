/**
 * @format
 */

import {AppRegistry, Platform} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import messaging from '@react-native-firebase/messaging';

// Required for Android: handles FCM messages when app is backgrounded or killed.
// Must be called before AppRegistry.registerComponent.
messaging().setBackgroundMessageHandler(async _remoteMessage => {
  // Firebase SDK auto-displays the notification from the notification payload.
});

AppRegistry.registerComponent(appName, () => App);
