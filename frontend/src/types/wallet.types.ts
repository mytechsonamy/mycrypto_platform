/**
 * Wallet related TypeScript types
 */

// Currency types supported by the platform
export type Currency = 'TRY' | 'BTC' | 'ETH' | 'USDT';

// Wallet balance for a specific currency
export interface WalletBalance {
  currency: Currency;
  availableBalance: string;
  lockedBalance: string;
  totalBalance: string;
}

// Wallet state for Redux
export interface WalletState {
  balances: WalletBalance[];
  loading: boolean;
  error: string | null;
}

// API response for wallet balances
export interface GetWalletBalancesResponse {
  success: boolean;
  data: WalletBalance[];
}

// Currency display metadata
export interface CurrencyMetadata {
  name: string;
  symbol: string;
  decimals: number;
  icon?: string;
}

// Currency metadata map
export const CURRENCY_METADATA: Record<Currency, CurrencyMetadata> = {
  TRY: {
    name: 'Türk Lirası',
    symbol: '₺',
    decimals: 2,
  },
  BTC: {
    name: 'Bitcoin',
    symbol: '₿',
    decimals: 8,
  },
  ETH: {
    name: 'Ethereum',
    symbol: 'Ξ',
    decimals: 8,
  },
  USDT: {
    name: 'Tether',
    symbol: '$',
    decimals: 2,
  },
};
