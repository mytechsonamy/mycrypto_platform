/**
 * Wallet API client
 * Integrates with wallet service backend API at /api/v1/wallet
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { GetWalletBalancesResponse, WalletBalance } from '../types/wallet.types';

// API base URL - wallet service runs on port 3002
const WALLET_API_BASE_URL = process.env.REACT_APP_WALLET_API_URL || 'http://localhost:3002/api/v1';

// Create axios instance with default config
const walletApiClient: AxiosInstance = axios.create({
  baseURL: WALLET_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor for adding auth tokens
walletApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
walletApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle common errors
    if (error.response) {
      const { status } = error.response;

      if (status === 401) {
        // Unauthorized - token expired or invalid
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Map HTTP status codes to user-friendly Turkish messages
 */
const mapErrorToMessage = (error: AxiosError): string => {
  if (!error.response) {
    return 'Baglanti hatasi. Lutfen internet baglantinizi kontrol edin.';
  }

  const { status } = error.response;

  switch (status) {
    case 400:
      return 'Gecersiz istek. Lutfen tekrar deneyin.';
    case 401:
      return 'Oturum suresi dolmus. Lutfen tekrar giris yapin.';
    case 403:
      return 'Bu islemi yapmaya yetkiniz yok.';
    case 404:
      return 'Cuzdan bulunamadi.';
    case 429:
      return 'Cok fazla istek gonderdiniz. Lutfen bir sure bekleyin.';
    case 500:
    case 502:
    case 503:
      return 'Sunucu hatasi olustu. Lutfen daha sonra tekrar deneyin.';
    default:
      return 'Beklenmeyen bir hata olustu. Lutfen tekrar deneyin.';
  }
};

// Flag to use mock responses during development
const USE_MOCK_API = process.env.REACT_APP_USE_MOCK_WALLET_API === 'true';

// Mock delay to simulate network latency
const mockDelay = (ms: number = 1000): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Get wallet balances for all currencies
 * @returns Promise with wallet balances array
 */
export const getWalletBalances = async (): Promise<GetWalletBalancesResponse> => {
  if (USE_MOCK_API) {
    await mockDelay(800);

    // Mock wallet balances
    const mockBalances: WalletBalance[] = [
      {
        currency: 'TRY',
        availableBalance: '12345.67',
        lockedBalance: '100.00',
        totalBalance: '12445.67',
      },
      {
        currency: 'BTC',
        availableBalance: '0.12345678',
        lockedBalance: '0.00000000',
        totalBalance: '0.12345678',
      },
      {
        currency: 'ETH',
        availableBalance: '1.23456789',
        lockedBalance: '0.05000000',
        totalBalance: '1.28456789',
      },
      {
        currency: 'USDT',
        availableBalance: '1000.50',
        lockedBalance: '0.00',
        totalBalance: '1000.50',
      },
    ];

    return {
      success: true,
      data: mockBalances,
    };
  }

  try {
    const response = await walletApiClient.get<GetWalletBalancesResponse>('/wallet/balances');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(mapErrorToMessage(error));
    }
    throw new Error('Cuzdan bakiyeleri alinirken bir hata olustu.');
  }
};

export default {
  getWalletBalances,
};
