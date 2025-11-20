/**
 * Unit tests for walletSlice
 */

import { configureStore } from '@reduxjs/toolkit';
import walletReducer, {
  fetchWalletBalances,
  clearWalletError,
  resetWallet,
  updateBalance,
  selectWalletBalances,
  selectWalletLoading,
  selectWalletError,
} from './walletSlice';
import { WalletState, WalletBalance } from '../../types/wallet.types';
import * as walletApi from '../../api/walletApi';

// Mock the API
jest.mock('../../api/walletApi');

const createMockStore = (initialState: WalletState) => {
  return configureStore({
    reducer: {
      wallet: walletReducer,
    },
    preloadedState: {
      wallet: initialState,
    },
  });
};

describe('walletSlice', () => {
  describe('reducers', () => {
    const initialState: WalletState = {
      balances: [],
      loading: false,
      error: null,
    };

    it('should return initial state', () => {
      expect(walletReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    it('should handle clearWalletError', () => {
      const stateWithError: WalletState = {
        ...initialState,
        error: 'Test error',
      };

      const nextState = walletReducer(stateWithError, clearWalletError());
      expect(nextState.error).toBeNull();
    });

    it('should handle resetWallet', () => {
      const stateWithData: WalletState = {
        balances: [
          {
            currency: 'TRY',
            availableBalance: '1000',
            lockedBalance: '0',
            totalBalance: '1000',
          },
        ],
        loading: false,
        error: 'Test error',
      };

      const nextState = walletReducer(stateWithData, resetWallet());
      expect(nextState).toEqual(initialState);
    });

    it('should handle updateBalance - update existing currency', () => {
      const stateWithBalance: WalletState = {
        balances: [
          {
            currency: 'TRY',
            availableBalance: '1000',
            lockedBalance: '0',
            totalBalance: '1000',
          },
        ],
        loading: false,
        error: null,
      };

      const updatedBalance: WalletBalance = {
        currency: 'TRY',
        availableBalance: '2000',
        lockedBalance: '100',
        totalBalance: '2100',
      };

      const nextState = walletReducer(stateWithBalance, updateBalance(updatedBalance));
      expect(nextState.balances).toHaveLength(1);
      expect(nextState.balances[0].totalBalance).toBe('2100');
    });

    it('should handle updateBalance - add new currency', () => {
      const stateWithBalance: WalletState = {
        balances: [
          {
            currency: 'TRY',
            availableBalance: '1000',
            lockedBalance: '0',
            totalBalance: '1000',
          },
        ],
        loading: false,
        error: null,
      };

      const newBalance: WalletBalance = {
        currency: 'BTC',
        availableBalance: '0.5',
        lockedBalance: '0',
        totalBalance: '0.5',
      };

      const nextState = walletReducer(stateWithBalance, updateBalance(newBalance));
      expect(nextState.balances).toHaveLength(2);
      expect(nextState.balances[1].currency).toBe('BTC');
    });
  });

  describe('async thunks', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should fetch wallet balances successfully', async () => {
      const mockBalances: WalletBalance[] = [
        {
          currency: 'TRY',
          availableBalance: '1000',
          lockedBalance: '0',
          totalBalance: '1000',
        },
        {
          currency: 'BTC',
          availableBalance: '0.5',
          lockedBalance: '0',
          totalBalance: '0.5',
        },
      ];

      (walletApi.getWalletBalances as jest.Mock).mockResolvedValue({
        success: true,
        data: mockBalances,
      });

      const initialState: WalletState = { balances: [], loading: false, error: null };
      const store = createMockStore(initialState);

      await store.dispatch(fetchWalletBalances());

      const state = store.getState().wallet;
      expect(state.loading).toBe(false);
      expect(state.balances).toEqual(mockBalances);
      expect(state.error).toBeNull();
    });

    it('should handle fetch wallet balances error', async () => {
      const errorMessage = 'Network error';
      (walletApi.getWalletBalances as jest.Mock).mockRejectedValue(new Error(errorMessage));

      const initialState: WalletState = { balances: [], loading: false, error: null };
      const store = createMockStore(initialState);

      await store.dispatch(fetchWalletBalances());

      const state = store.getState().wallet;
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('extra reducers', () => {
    const initialState: WalletState = {
      balances: [],
      loading: false,
      error: null,
    };

    it('should handle fetchWalletBalances.pending', () => {
      const action = { type: fetchWalletBalances.pending.type };
      const state = walletReducer(initialState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle fetchWalletBalances.fulfilled', () => {
      const mockBalances: WalletBalance[] = [
        {
          currency: 'TRY',
          availableBalance: '1000',
          lockedBalance: '0',
          totalBalance: '1000',
        },
      ];

      const action = {
        type: fetchWalletBalances.fulfilled.type,
        payload: mockBalances,
      };
      const state = walletReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.balances).toEqual(mockBalances);
    });

    it('should handle fetchWalletBalances.rejected', () => {
      const errorMessage = 'Failed to fetch';
      const action = {
        type: fetchWalletBalances.rejected.type,
        payload: errorMessage,
      };
      const state = walletReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('selectors', () => {
    const mockState = {
      wallet: {
        balances: [
          {
            currency: 'TRY' as const,
            availableBalance: '1000',
            lockedBalance: '0',
            totalBalance: '1000',
          },
        ],
        loading: false,
        error: null,
      },
    };

    it('should select wallet balances', () => {
      expect(selectWalletBalances(mockState)).toEqual(mockState.wallet.balances);
    });

    it('should select wallet loading state', () => {
      expect(selectWalletLoading(mockState)).toBe(false);
    });

    it('should select wallet error', () => {
      expect(selectWalletError(mockState)).toBeNull();
    });
  });
});
