/**
 * Unit tests for WalletBalanceCard component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WalletBalanceCard from './WalletBalanceCard';
import { WalletBalance } from '../../types/wallet.types';

describe('WalletBalanceCard', () => {
  const mockOnDeposit = jest.fn();
  const mockOnWithdraw = jest.fn();

  const mockTRYBalance: WalletBalance = {
    currency: 'TRY',
    availableBalance: '12345.67',
    lockedBalance: '100.00',
    totalBalance: '12445.67',
  };

  const mockBTCBalance: WalletBalance = {
    currency: 'BTC',
    availableBalance: '0.12345678',
    lockedBalance: '0.00000000',
    totalBalance: '0.12345678',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render TRY balance card with correct values', () => {
      render(
        <WalletBalanceCard
          balance={mockTRYBalance}
          onDeposit={mockOnDeposit}
          onWithdraw={mockOnWithdraw}
        />
      );

      expect(screen.getByText('Türk Lirası')).toBeInTheDocument();
      expect(screen.getByText(/12.445,67 ₺/)).toBeInTheDocument();
      expect(screen.getByText(/12.345,67 ₺/)).toBeInTheDocument();
      expect(screen.getByText(/100,00 ₺/)).toBeInTheDocument();
    });

    it('should render BTC balance card with correct values', () => {
      render(
        <WalletBalanceCard
          balance={mockBTCBalance}
          onDeposit={mockOnDeposit}
          onWithdraw={mockOnWithdraw}
        />
      );

      expect(screen.getByText('Bitcoin')).toBeInTheDocument();
      const btcAmounts = screen.getAllByText(/0,12345678 ₿/);
      expect(btcAmounts.length).toBeGreaterThan(0);
    });

    it('should not show locked balance when it is zero', () => {
      render(
        <WalletBalanceCard
          balance={mockBTCBalance}
          onDeposit={mockOnDeposit}
          onWithdraw={mockOnWithdraw}
        />
      );

      expect(screen.queryByText(/Kilitli/)).not.toBeInTheDocument();
    });

    it('should show locked balance when it is greater than zero', () => {
      render(
        <WalletBalanceCard
          balance={mockTRYBalance}
          onDeposit={mockOnDeposit}
          onWithdraw={mockOnWithdraw}
        />
      );

      expect(screen.getByText(/Kilitli \(Emirlerde\):/)).toBeInTheDocument();
    });

    it('should render deposit and withdraw buttons', () => {
      render(
        <WalletBalanceCard
          balance={mockTRYBalance}
          onDeposit={mockOnDeposit}
          onWithdraw={mockOnWithdraw}
        />
      );

      expect(screen.getByRole('button', { name: /Türk Lirası yatir/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Türk Lirası cek/i })).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should render skeleton when loading', () => {
      const { container } = render(
        <WalletBalanceCard
          balance={mockTRYBalance}
          onDeposit={mockOnDeposit}
          onWithdraw={mockOnWithdraw}
          loading={true}
        />
      );

      const skeletons = container.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not render actual content when loading', () => {
      render(
        <WalletBalanceCard
          balance={mockTRYBalance}
          onDeposit={mockOnDeposit}
          onWithdraw={mockOnWithdraw}
          loading={true}
        />
      );

      expect(screen.queryByText('Türk Lirası')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /yatir/i })).not.toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('should call onDeposit when deposit button is clicked', () => {
      render(
        <WalletBalanceCard
          balance={mockTRYBalance}
          onDeposit={mockOnDeposit}
          onWithdraw={mockOnWithdraw}
        />
      );

      const depositButton = screen.getByRole('button', { name: /Türk Lirası yatir/i });
      fireEvent.click(depositButton);

      expect(mockOnDeposit).toHaveBeenCalledTimes(1);
      expect(mockOnDeposit).toHaveBeenCalledWith('TRY');
    });

    it('should call onWithdraw when withdraw button is clicked', () => {
      render(
        <WalletBalanceCard
          balance={mockTRYBalance}
          onDeposit={mockOnDeposit}
          onWithdraw={mockOnWithdraw}
        />
      );

      const withdrawButton = screen.getByRole('button', { name: /Türk Lirası cek/i });
      fireEvent.click(withdrawButton);

      expect(mockOnWithdraw).toHaveBeenCalledTimes(1);
      expect(mockOnWithdraw).toHaveBeenCalledWith('TRY');
    });
  });

  describe('accessibility', () => {
    it('should have proper aria-label for card', () => {
      render(
        <WalletBalanceCard
          balance={mockTRYBalance}
          onDeposit={mockOnDeposit}
          onWithdraw={mockOnWithdraw}
        />
      );

      expect(screen.getByRole('article', { name: /Türk Lirası cuzdan kartı/i })).toBeInTheDocument();
    });

    it('should have proper aria-label for total balance', () => {
      render(
        <WalletBalanceCard
          balance={mockTRYBalance}
          onDeposit={mockOnDeposit}
          onWithdraw={mockOnWithdraw}
        />
      );

      const totalBalanceElement = screen.getByLabelText(/Toplam bakiye:/);
      expect(totalBalanceElement).toBeInTheDocument();
    });

    it('should have proper aria-labels for buttons', () => {
      render(
        <WalletBalanceCard
          balance={mockTRYBalance}
          onDeposit={mockOnDeposit}
          onWithdraw={mockOnWithdraw}
        />
      );

      expect(screen.getByLabelText(/Türk Lirası yatir/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Türk Lirası cek/)).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle zero balances', () => {
      const zeroBalance: WalletBalance = {
        currency: 'TRY',
        availableBalance: '0.00',
        lockedBalance: '0.00',
        totalBalance: '0.00',
      };

      render(
        <WalletBalanceCard
          balance={zeroBalance}
          onDeposit={mockOnDeposit}
          onWithdraw={mockOnWithdraw}
        />
      );

      const zeroAmounts = screen.getAllByText(/0,00 ₺/);
      expect(zeroAmounts.length).toBeGreaterThan(0);
    });

    it('should handle invalid balance values gracefully', () => {
      const invalidBalance: WalletBalance = {
        currency: 'TRY',
        availableBalance: 'invalid',
        lockedBalance: '0',
        totalBalance: 'invalid',
      };

      render(
        <WalletBalanceCard
          balance={invalidBalance}
          onDeposit={mockOnDeposit}
          onWithdraw={mockOnWithdraw}
        />
      );

      // Should render without crashing and show 0.00
      expect(screen.getByText('Türk Lirası')).toBeInTheDocument();
    });
  });
});
