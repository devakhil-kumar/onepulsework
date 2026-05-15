import {createSlice} from '@reduxjs/toolkit';
import {saveTheme} from '@utils/storage';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {theme: 'system'},
  reducers: {
    setTheme(state, {payload}) {
      state.theme = payload;
      saveTheme(payload);
    },
    initTheme(state, {payload}) {
      state.theme = payload ?? 'system';
    },
  },
});

export const {setTheme, initTheme} = uiSlice.actions;
export const selectTheme = s => s.ui.theme;
export default uiSlice.reducer;
