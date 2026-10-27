import { createSlice } from '@reduxjs/toolkit';

const load = () => {
  try {
    return JSON.parse(localStorage.getItem('vm_cart')) || [];
  } catch {
    return [];
  }
};
const persist = (items) => {
  try {
    localStorage.setItem('vm_cart', JSON.stringify(items));
  } catch {
    /* storage unavailable */
  }
};

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: load() },
  reducers: {
    addItem: (state, { payload }) => {
      const existing = state.items.find((i) => i.productId === payload.productId);
      const max = payload.maxQty || 1;
      if (existing) existing.quantity = Math.min(existing.quantity + (payload.quantity || 1), max);
      else state.items.push({ ...payload, quantity: Math.min(payload.quantity || 1, max) });
      persist(state.items);
    },
    setQuantity: (state, { payload }) => {
      const item = state.items.find((i) => i.productId === payload.productId);
      if (item) item.quantity = Math.max(1, Math.min(payload.quantity, item.maxQty));
      persist(state.items);
    },
    removeItem: (state, { payload }) => {
      state.items = state.items.filter((i) => i.productId !== payload);
      persist(state.items);
    },
    clearCart: (state) => {
      state.items = [];
      persist(state.items);
    },
  },
});

export const { addItem, setQuantity, removeItem, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
