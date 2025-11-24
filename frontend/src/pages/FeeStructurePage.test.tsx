/**
 * Tests for FeeStructurePage
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import FeeStructurePage from './FeeStructurePage';

// Mock useMediaQuery
jest.mock('@mui/material/useMediaQuery');
const mockedUseMediaQuery = useMediaQuery as jest.Mock;

// Create theme for tests
const theme = createTheme();

// Wrapper component for tests
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      <BrowserRouter>{component}</BrowserRouter>
    </ThemeProvider>
  );
};

describe('FeeStructurePage', () => {
  beforeEach(() => {
    // Mock useMediaQuery to return false (desktop)
    mockedUseMediaQuery.mockReturnValue(false);
  });

  describe('Page Structure and Navigation', () => {
    it('renders page title and description', () => {
      renderWithRouter(<FeeStructurePage />);
      expect(screen.getByRole('heading', { name: /ücret yapısı/i })).toBeInTheDocument();
      expect(
        screen.getByText(/MyCrypto Platform'da işlem yaparken uygulanacak tüm ücretler/i)
      ).toBeInTheDocument();
    });

    it('renders breadcrumb navigation', () => {
      renderWithRouter(<FeeStructurePage />);
      const nav = screen.getByRole('navigation', { name: /breadcrumb/i });
      expect(nav).toBeInTheDocument();
      expect(within(nav).getByText('Ana Sayfa')).toBeInTheDocument();
    });

    it('renders tab navigation', () => {
      renderWithRouter(<FeeStructurePage />);
      expect(screen.getByText('İşlem Ücretleri')).toBeInTheDocument();
      expect(screen.getByText('Yatırım Ücretleri')).toBeInTheDocument();
      expect(screen.getByText('Çekim Ücretleri')).toBeInTheDocument();
      expect(screen.getByText('Sık Sorulan Sorular')).toBeInTheDocument();
    });

    it('renders disclaimer section', () => {
      renderWithRouter(<FeeStructurePage />);
      expect(screen.getByText(/önemli notlar:/i)).toBeInTheDocument();
      expect(
        screen.getByText(/blockchain ağ ücretleri.*anlık olarak değişkenlik gösterebilir/i)
      ).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('shows trading fees section by default', () => {
      renderWithRouter(<FeeStructurePage />);
      expect(screen.getByText(/maker ücreti/i)).toBeInTheDocument();
      expect(screen.getByText(/taker ücreti/i)).toBeInTheDocument();
    });

    it('switches between tabs', () => {
      renderWithRouter(<FeeStructurePage />);

      // Click deposit tab
      const depositTab = screen.getByText('Yatırım Ücretleri');
      fireEvent.click(depositTab);
      expect(screen.getByText(/yatırım işlemleri ücretleri/i)).toBeInTheDocument();

      // Click withdrawal tab
      const withdrawalTab = screen.getByText('Çekim Ücretleri');
      fireEvent.click(withdrawalTab);
      expect(screen.getByText(/çekim işlemleri ücretleri/i)).toBeInTheDocument();

      // Click FAQ tab
      const faqTab = screen.getByText('Sık Sorulan Sorular');
      fireEvent.click(faqTab);
      expect(screen.getByPlaceholderText(/soru ara/i)).toBeInTheDocument();
    });
  });

  describe('Trading Fees Section', () => {
    beforeEach(() => {
      renderWithRouter(<FeeStructurePage />);
    });

    it('displays maker and taker fee information', () => {
      expect(screen.getByText(/maker ücreti/i)).toBeInTheDocument();
      expect(screen.getByText(/taker ücreti/i)).toBeInTheDocument();
      expect(screen.getByText('0.1%')).toBeInTheDocument();
      expect(screen.getByText('0.2%')).toBeInTheDocument();
    });

    it('shows fee calculation examples table', () => {
      expect(screen.getByText(/ücret hesaplama örnekleri/i)).toBeInTheDocument();
      expect(screen.getByText(/senaryo/i)).toBeInTheDocument();
      expect(screen.getByText(/emir tipi/i)).toBeInTheDocument();
      expect(screen.getByText(/toplam maliyet/i)).toBeInTheDocument();
    });

    it('displays maker and taker examples in table', () => {
      expect(screen.getByText('Limit')).toBeInTheDocument();
      expect(screen.getByText('Market')).toBeInTheDocument();
    });

    it('shows when each fee applies explanation', () => {
      expect(screen.getByText(/hangi durumlarda uygulanır/i)).toBeInTheDocument();
      expect(screen.getByText(/maker ücreti örnekleri:/i)).toBeInTheDocument();
      expect(screen.getByText(/taker ücreti örnekleri:/i)).toBeInTheDocument();
    });

    it('displays fee savings tip', () => {
      expect(screen.getByText(/ipucu:/i)).toBeInTheDocument();
    });
  });

  describe('Deposit Fees Section', () => {
    beforeEach(() => {
      renderWithRouter(<FeeStructurePage />);
      const depositTab = screen.getByText('Yatırım Ücretleri');
      fireEvent.click(depositTab);
    });

    it('displays deposit fees overview', () => {
      expect(screen.getByText(/yatırım işlemleri ücretleri/i)).toBeInTheDocument();
    });

    it('shows deposit fees table with all currencies', () => {
      expect(screen.getByText('TRY')).toBeInTheDocument();
      expect(screen.getByText('BTC')).toBeInTheDocument();
      expect(screen.getByText('ETH')).toBeInTheDocument();
      expect(screen.getByText('USDT')).toBeInTheDocument();
    });

    it('displays TRY as free deposit', () => {
      expect(screen.getByText(/ücretsiz/i)).toBeInTheDocument();
    });

    it('shows blockchain network fees for crypto', () => {
      const text = screen.getAllByText(/ağ ücreti/i);
      expect(text.length).toBeGreaterThan(0);
    });

    it('displays detailed explanations for each currency', () => {
      expect(screen.getByText(/TRY yatırımları \(Türk Lirası\)/i)).toBeInTheDocument();
      expect(screen.getByText(/BTC yatırımları \(Bitcoin\)/i)).toBeInTheDocument();
      expect(screen.getByText(/ETH yatırımları \(Ethereum\)/i)).toBeInTheDocument();
      expect(screen.getByText(/USDT yatırımları \(Tether\)/i)).toBeInTheDocument();
    });

    it('shows important notice about blockchain fees', () => {
      expect(
        screen.getByText(/blockchain ağ ücretleri anlık olarak değişkenlik gösterebilir/i)
      ).toBeInTheDocument();
    });
  });

  describe('Withdrawal Fees Section', () => {
    beforeEach(() => {
      renderWithRouter(<FeeStructurePage />);
      const withdrawalTab = screen.getByText('Çekim Ücretleri');
      fireEvent.click(withdrawalTab);
    });

    it('displays withdrawal fees overview', () => {
      expect(screen.getByText(/çekim işlemleri ücretleri/i)).toBeInTheDocument();
    });

    it('shows withdrawal fees table with all currencies', () => {
      expect(screen.getByText('TRY')).toBeInTheDocument();
      expect(screen.getByText('BTC')).toBeInTheDocument();
      expect(screen.getByText('ETH')).toBeInTheDocument();
      expect(screen.getByText('USDT')).toBeInTheDocument();
    });

    it('displays TRY withdrawal fee', () => {
      expect(screen.getByText('10 TRY')).toBeInTheDocument();
    });

    it('shows minimum withdrawal amounts', () => {
      expect(screen.getByText('100 TRY')).toBeInTheDocument();
      expect(screen.getByText('0.001 BTC')).toBeInTheDocument();
      expect(screen.getByText('0.01 ETH')).toBeInTheDocument();
      expect(screen.getByText('10 USDT')).toBeInTheDocument();
    });

    it('displays detailed explanations for each currency', () => {
      expect(screen.getByText(/TRY çekimleri \(Türk Lirası\)/i)).toBeInTheDocument();
      expect(screen.getByText(/BTC çekimleri \(Bitcoin\)/i)).toBeInTheDocument();
      expect(screen.getByText(/ETH çekimleri \(Ethereum\)/i)).toBeInTheDocument();
      expect(screen.getByText(/USDT çekimleri \(Tether\)/i)).toBeInTheDocument();
    });

    it('shows fee responsibility explanation', () => {
      expect(screen.getByText(/ücretleri kim öder/i)).toBeInTheDocument();
    });

    it('displays warning about incorrect addresses', () => {
      expect(
        screen.getByText(/doğru adres bilgilerini girdiğinizden emin olun/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/blockchain işlemleri geri alınamaz/i)).toBeInTheDocument();
    });
  });

  describe('FAQ Section', () => {
    beforeEach(() => {
      renderWithRouter(<FeeStructurePage />);
      const faqTab = screen.getByText('Sık Sorulan Sorular');
      fireEvent.click(faqTab);
    });

    it('displays FAQ section header', () => {
      expect(screen.getAllByText(/sık sorulan sorular/i).length).toBeGreaterThan(0);
    });

    it('shows search box', () => {
      expect(screen.getByPlaceholderText(/soru ara/i)).toBeInTheDocument();
    });

    it('displays FAQ items as accordions', () => {
      expect(
        screen.getByText(/neden taker ücreti maker ücretinden daha yüksek/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/blockchain ağ ücretlerini kim öder/i)).toBeInTheDocument();
      expect(screen.getByText(/işlem ücretlerimi nasıl azaltabilirim/i)).toBeInTheDocument();
    });

    it('expands accordion when clicked', () => {
      const accordionButton = screen.getByText(/neden taker ücreti maker ücretinden daha yüksek/i);
      fireEvent.click(accordionButton);

      expect(
        screen.getByText(/maker emirler piyasaya likidite sağlar/i)
      ).toBeInTheDocument();
    });

    it('filters FAQ items based on search term', () => {
      const searchBox = screen.getByPlaceholderText(/soru ara/i);
      fireEvent.change(searchBox, { target: { value: 'blockchain' } });

      expect(screen.getByText(/blockchain ağ ücretlerini kim öder/i)).toBeInTheDocument();
      expect(screen.getByText(/blockchain ağ ücretleri neden değişiyor/i)).toBeInTheDocument();
    });

    it('shows no results message when search has no matches', () => {
      const searchBox = screen.getByPlaceholderText(/soru ara/i);
      fireEvent.change(searchBox, { target: { value: 'xyz123notfound' } });

      expect(screen.getByText(/aradığınız soru bulunamadı/i)).toBeInTheDocument();
    });

    it('displays contact support section', () => {
      expect(screen.getByText(/sorunuza cevap bulamadınız mı/i)).toBeInTheDocument();
      expect(screen.getByText(/destek@mycrypto.com.tr/i)).toBeInTheDocument();
      expect(screen.getByText(/0850 123 45 67/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('uses semantic HTML elements', () => {
      renderWithRouter(<FeeStructurePage />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getAllByRole('heading').length).toBeGreaterThan(0);
    });

    it('has tab navigation', () => {
      renderWithRouter(<FeeStructurePage />);
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(4);
    });
  });

  describe('Responsive Design', () => {
    it('renders without errors on mobile viewport', () => {
      mockedUseMediaQuery.mockReturnValue(true); // Mobile
      renderWithRouter(<FeeStructurePage />);

      expect(screen.getByRole('heading', { name: /ücret yapısı/i })).toBeInTheDocument();
    });

    it('renders without errors on desktop viewport', () => {
      mockedUseMediaQuery.mockReturnValue(false); // Desktop
      renderWithRouter(<FeeStructurePage />);

      expect(screen.getByRole('heading', { name: /ücret yapısı/i })).toBeInTheDocument();
    });
  });
});
