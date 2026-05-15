import {createContext, useContext} from 'react';

export const DrawerContext = createContext({
  toggle: () => {},
  close: () => {},
});

export const useDrawer = () => useContext(DrawerContext);
