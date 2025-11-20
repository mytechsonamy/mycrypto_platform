/**
 * Redux slice for wallet state management
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { WalletState, WalletBalance } from '../../types/wallet.types';
import { getWalletBalances as getWalletBalancesApi } from '../../api/walletApi';

// Initial state
const initialState: WalletState = {
  balances: [],
  loading: false,
  error: null,
};

/**
 * Async thunk for fetching wallet balances
 */
export const fetchWalletBalances = createAsyncThunk(
  'wallet/fetchBalances',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getWalletBalancesApi();
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Cuzdan bakiyeleri alinirken bir hata olustu.');
    }
  }
);

/**
 * Wallet slice
 */
const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    // Clear error state
    clearWalletError: (state) => {
      state.error = null;
    },
    // Reset wallet state
    resetWallet: (state) => {
      state.balances = [];
      state.loading = false;
      state.error = null;
    },
    // Update a specific wallet balance (for WebSocket updates)
    updateBalance: (state, action) => {
      const updatedBalance: WalletBalance = action.payload;
      const index = state.balances.findIndex(
        (balance) => balance.currency === updatedBalance.currency
      );
      if (index !== -1) {
        state.balances[index] = updatedBalance;
      } else {
        state.balances.push(updatedBalance);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch wallet balances pending
      .addCase(fetchWalletBalances.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      // Fetch wallet balances fulfilled
      .addCase(fetchWalletBalances.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.balances = action.payload;
      })
      // Fetch wallet balances rejected
      .addCase(fetchWalletBalances.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Cuzdan bakiyeleri alinamadi.';
      });
  },
});

// Export actions
export const { clearWalletError, resetWallet, updateBalance } = walletSlice.actions;

// Export reducer
export default walletSlice.reducer;

// Selectors
export const selectWallet = (state: { wallet: WalletState }) => state.wallet;
export const selectWalletBalances = (state: { wallet: WalletState }) => state.wallet.balances;
export const selectWalletLoading = (state: { wallet: WalletState }) => state.wallet.loading;
export const selectWalletError = (state: { wallet: WalletState }) => state.wallet.error;

// Selector to get balance for a specific currency
export const selectBalanceByCurrency = (currency: string) => (state: { wallet: WalletState }) => {
  return state.wallet.balances.find((balance) => balance.currency === currency);
};
