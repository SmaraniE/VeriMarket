import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api, { errMsg } from '../utils/api';

export const fetchProducts = createAsyncThunk('products/fetchList', async (params, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/products', { params });
    return data;
  } catch (e) {
    return rejectWithValue(errMsg(e));
  }
});

export const fetchProduct = createAsyncThunk('products/fetchOne', async (id, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/products/${id}`);
    return data;
  } catch (e) {
    return rejectWithValue(e?.response?.status === 404 ? 'This listing could not be found.' : errMsg(e));
  }
});

export const fetchBids = createAsyncThunk('products/fetchBids', async (id) => {
  const { data } = await api.get(`/bids/product/${id}`);
  return data;
});

const initialState = {
  list: { items: [], page: 1, pages: 1, total: 0, status: 'idle', error: null },
  current: null,
  currentStatus: 'idle',
  currentError: null,
  clockOffset: 0, // serverNow - clientNow, so every countdown agrees with the server
  bids: [],
};

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    clearCurrent: (state) => {
      state.current = null;
      state.currentStatus = 'idle';
      state.currentError = null;
      state.bids = [];
    },
    // Merge a `bid_update` pushed over the socket (or returned by REST) into the open auction
    applyLiveUpdate: (state, { payload }) => {
      if (!state.current || String(state.current._id) !== payload.productId) return;
      const c = state.current;
      c.currentBid = payload.currentBid;
      c.bidCount = payload.bidCount;
      c.highestBidder = payload.highestBidder;
      c.highestBidderName = payload.highestBidderName;
      c.reserveMet = payload.reserveMet;
      c.minNextBid = payload.minNextBid;
      c.increment = payload.increment;
      c.endListingTime = payload.endListingTime;
      c.status = payload.status;
      if (payload.serverTime) state.clockOffset = payload.serverTime - Date.now();
      if (payload.newBids?.length) state.bids = [...payload.newBids, ...state.bids].slice(0, 50);
    },
    applyAuctionEnded: (state, { payload }) => {
      if (!state.current || String(state.current._id) !== payload.productId) return;
      state.current.status = payload.status;
      state.current.finalPrice = payload.finalPrice;
      state.current.winnerName = payload.winnerName;
      state.current.reserveMet = payload.reserveMet;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.list.status = 'loading';
        state.list.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, { payload }) => {
        state.list = { ...payload, items: payload.products, status: 'idle', error: null };
      })
      .addCase(fetchProducts.rejected, (state, { payload }) => {
        state.list.status = 'idle';
        state.list.error = payload;
      })
      .addCase(fetchProduct.pending, (state) => {
        state.currentStatus = 'loading';
        state.currentError = null;
      })
      .addCase(fetchProduct.fulfilled, (state, { payload }) => {
        state.currentStatus = 'idle';
        state.current = payload;
        state.clockOffset = payload.serverTime - Date.now();
      })
      .addCase(fetchProduct.rejected, (state, { payload }) => {
        state.currentStatus = 'idle';
        state.currentError = payload;
        state.current = null;
      })
      .addCase(fetchBids.fulfilled, (state, { payload }) => {
        state.bids = payload;
      });
  },
});

export const { clearCurrent, applyLiveUpdate, applyAuctionEnded } = productSlice.actions;
export default productSlice.reducer;
