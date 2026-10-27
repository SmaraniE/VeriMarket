import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api, { errMsg } from '../utils/api';
import { reconnectSocket } from '../utils/socket';

const readToken = () => {
  try {
    return localStorage.getItem('vm_token');
  } catch {
    return null;
  }
};
const saveToken = (token) => {
  try {
    if (token) localStorage.setItem('vm_token', token);
    else localStorage.removeItem('vm_token');
  } catch {
    /* storage unavailable */
  }
};

const authRequest = (type, url) =>
  createAsyncThunk(type, async (body, { rejectWithValue }) => {
    try {
      const { data } = await api.post(url, body);
      saveToken(data.token);
      reconnectSocket(); // re-handshake so the socket knows who we are
      return data;
    } catch (e) {
      return rejectWithValue(errMsg(e));
    }
  });

export const login = authRequest('auth/login', '/auth/login');
export const register = authRequest('auth/register', '/auth/register');

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/auth/me');
    return data.user;
  } catch (e) {
    return rejectWithValue(e?.response?.status === 401 ? 'expired' : errMsg(e));
  }
});

export const toggleWatch = createAsyncThunk('auth/toggleWatch', async (productId, { rejectWithValue }) => {
  try {
    const { data } = await api.post(`/auth/watchlist/${productId}`);
    return data;
  } catch (e) {
    return rejectWithValue(errMsg(e));
  }
});

export const updateProfile = createAsyncThunk('auth/updateProfile', async (updates, { rejectWithValue }) => {
  try {
    const { data } = await api.put('/auth/profile', updates);
    return data.user;
  } catch (e) {
    return rejectWithValue(errMsg(e));
  }
});

export const changePassword = createAsyncThunk('auth/changePassword', async (body, { rejectWithValue }) => {
  try {
    const { data } = await api.put('/auth/password', body);
    return data;
  } catch (e) {
    return rejectWithValue(errMsg(e));
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, token: readToken(), status: 'idle', error: null },
  reducers: {
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.error = null;
    },
    clearAuthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const pending = (state) => {
      state.status = 'loading';
      state.error = null;
    };
    const signedIn = (state, { payload }) => {
      state.status = 'idle';
      state.user = payload.user;
      state.token = payload.token;
    };
    const failed = (state, { payload }) => {
      state.status = 'idle';
      state.error = payload || 'Something went wrong';
    };
    builder
      .addCase(login.pending, pending)
      .addCase(login.fulfilled, signedIn)
      .addCase(login.rejected, failed)
      .addCase(register.pending, pending)
      .addCase(register.fulfilled, signedIn)
      .addCase(register.rejected, failed)
      .addCase(fetchMe.fulfilled, (state, { payload }) => {
        state.user = payload;
      })
      .addCase(fetchMe.rejected, (state, { payload }) => {
        if (payload === 'expired') {
          saveToken(null);
          state.token = null;
          state.user = null;
        }
      })
      .addCase(toggleWatch.fulfilled, (state, { payload }) => {
        if (state.user) state.user.watchlist = payload.watchlist;
      })
      .addCase(updateProfile.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, { payload }) => {
        state.status = 'idle';
        state.user = payload;
      })
      .addCase(updateProfile.rejected, (state, { payload }) => {
        state.status = 'idle';
        state.error = payload || 'Failed to update profile';
      })
      .addCase(changePassword.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.status = 'idle';
      })
      .addCase(changePassword.rejected, (state, { payload }) => {
        state.status = 'idle';
        state.error = payload || 'Failed to change password';
      });
  },
});

export const { clearAuth, clearAuthError } = authSlice.actions;

export const logout = () => (dispatch) => {
  saveToken(null);
  dispatch(clearAuth());
  reconnectSocket();
};

export default authSlice.reducer;
