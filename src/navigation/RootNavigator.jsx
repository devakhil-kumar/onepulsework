import React, {useEffect, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useAppDispatch, useAppSelector} from '@app/hooks';
import {setCredentials, selectIsAuthenticated} from '@features/auth/authSlice';
import {loadAuth} from '@utils/storage';
import {Spinner} from '@components/ui';

import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';

const Root = createNativeStackNavigator();

export default function RootNavigator() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [ready, setReady] = useState(false);

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
    <NavigationContainer>
      <Root.Navigator screenOptions={{headerShown: false, animation: 'fade'}}>
        {isAuthenticated ? (
          <Root.Screen name="App" component={AppNavigator} />
        ) : (
          <Root.Screen name="Auth" component={AuthNavigator} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}
