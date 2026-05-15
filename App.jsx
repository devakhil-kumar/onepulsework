import React, {useEffect} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {Provider, useDispatch} from 'react-redux';
import store from './src/app/store';
import {injectStore} from './src/api/client';
import {ThemeProvider} from './src/app/ThemeContext';
import {initTheme} from './src/features/ui/uiSlice';
import {loadTheme} from './src/utils/storage';
import RootNavigator from './src/navigation/RootNavigator';

injectStore(store);

function AppInner() {
  const dispatch = useDispatch();

  useEffect(() => {
    loadTheme().then(t => dispatch(initTheme(t)));
  }, [dispatch]);

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <RootNavigator />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppInner />
    </Provider>
  );
}
