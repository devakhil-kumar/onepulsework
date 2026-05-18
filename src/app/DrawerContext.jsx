import {createContext, useContext} from 'react';

export const DrawerContext = createContext({
  visible: false,
  toggle: () => {},
  close: () => {},
});

export const useDrawer = () => useContext(DrawerContext);
