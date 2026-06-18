import React, {useEffect, useState} from 'react';
import {View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useAppDispatch, useAppSelector} from '@app/hooks';
import {setCredentials, selectIsAuthenticated} from '@features/auth/authSlice';
import {loadAuth} from '@utils/storage';
import {Spinner} from '@components/ui';
import {usePushNotification} from '@hooks/usePushNotification';
import {InAppNotificationBanner, AccountStateGate} from '@components/common';
import {useGetOrgInfoQuery} from '@features/admin/adminApi';
import {setDisplayConfig} from '@utils/format';

import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';

const Root = createNativeStackNavigator();

export default function RootNavigator() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [ready, setReady] = useState(false);

  // Registers FCM token on login, cleans up on logout
  usePushNotification(isAuthenticated);

  // Apply the org's timezone + date/time format app-wide (stored UTC → shown in
  // the workplace timezone & chosen format), so every user sees the same thing
  // regardless of device. Critical for attendance & payroll.
  const {data: orgInfo} = useGetOrgInfoQuery(undefined, {skip: !isAuthenticated});
  useEffect(() => {
    const o = orgInfo?.organisation ?? orgInfo;
    if (o) setDisplayConfig({timezone: o.timezone, timeFormat: o.timeFormat, dateFormat: o.dateFormat});
  }, [orgInfo]);

  useEffect(() => {
    // Restore saved session from AsyncStorage
    loadAuth().then(saved => {
      if (saved?.accessToken && saved?.user) {
        dispatch(setCredentials(saved));
      }
      setReady(true);
    });
  }, [dispatch]);

  if (!ready) return <Spinner full />;

  return (
    <View style={{flex: 1}}>
      <NavigationContainer>
        <Root.Navigator screenOptions={{headerShown: false, animation: 'fade'}}>
          {isAuthenticated ? (
            <Root.Screen name="App" component={AppNavigator} />
          ) : (
            <Root.Screen name="Auth" component={AuthNavigator} />
          )}
        </Root.Navigator>
      </NavigationContainer>
      {/* Floats above all screens — only active when authenticated */}
      {isAuthenticated && <InAppNotificationBanner />}
      {isAuthenticated && (
        <AccountStateGate accountState={(orgInfo?.organisation ?? orgInfo)?.accountState} />
      )}
    </View>
  );
}
