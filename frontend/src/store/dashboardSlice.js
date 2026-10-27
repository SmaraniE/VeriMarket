import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api, { errMsg } from '../utils/api';

// Loads everything the dashboard shows in one round trip
export const loadDashboard = createAsyncThunk('dashboard/load', async (_, { getState, rejectWithValue }) => {
  try {
    const isAdmin = getState().auth.user?.role === 'admin';
    const [bids, watchlist, orders, sales, listings, pending] = await Promise.all([
      api.get('/bids/mine'),
      api.get('/auth/watchlist'),
      api.get('/orders/mine'),
      api.get('/orders/selling'),
      api.get('/products/mine/listings'),
      isAdmin ? api.get('/products/admin/pending') : Promise.resolve({ data: [] }),
    ]);
    return {
      bids: bids.data,
      watchlist: watchlist.data,
      orders: orders.data,
      sales: sales.data,
      listings: listings.data,
      pending: pending.data,
    };
  } catch (e) {
    return rejectWithValue(errMsg(e));
  }
});

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: { bids: [], watchlist: [], orders: [], sales: [], listings: [], pending: [], status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadDashboard.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadDashboard.fulfilled, (state, { payload }) => ({ ...state, ...payload, status: 'ready', error: null }))
      .addCase(loadDashboard.rejected, (state, { payload }) => {
        state.status = 'ready';
        state.error = payload;
      });
  },
});

export default dashboardSlice.reducer;
