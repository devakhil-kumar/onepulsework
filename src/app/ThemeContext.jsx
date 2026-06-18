import React, {createContext, useContext, useMemo} from 'react';
import {useColorScheme} from 'react-native';
import {useAppSelector} from './hooks';
import {colors as lightColors} from '@theme/colors';
import {darkColors} from '@theme/darkColors';

const ThemeContext = createContext(lightColors);
const IsDarkContext = createContext(false);

export function ThemeProvider({children}) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const userTheme = useAppSelector(s => s.ui?.theme ?? 'system');

  const effective = useMemo(() => {
    return userTheme === 'system' ? (systemScheme ?? 'light') : userTheme;
  }, [userTheme, systemScheme]);

  const palette = useMemo(() => {
    return effective === 'dark' ? darkColors : lightColors;
  }, [effective]);

  return (
    <IsDarkContext.Provider value={effective === 'dark'}>
      <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>
    </IsDarkContext.Provider>
  );
}

export const useColors = () => useContext(ThemeContext);
export const useIsDark = () => useContext(IsDarkContext);
