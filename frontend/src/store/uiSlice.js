import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: { toasts: [] },
  reducers: {
    addToast: (state, { payload }) => {
      state.toasts.push(payload);
    },
    removeToast: (state, { payload }) => {
      state.toasts = state.toasts.filter((t) => t.id !== payload);
    },
  },
});

export const { addToast, removeToast } = uiSlice.actions;

// type: 'good' | 'warn' | 'bad' | 'info'. Optional `link` renders a "View" link.
export const pushToast = (toast) => (dispatch) => {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  dispatch(addToast({ type: 'info', ...toast, id }));
  setTimeout(() => dispatch(removeToast(id)), 7000);
};

export default uiSlice.reducer;
