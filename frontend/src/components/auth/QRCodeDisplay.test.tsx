/**
 * QR Code Display Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QRCodeDisplay from './QRCodeDisplay';

// Mock clipboard API
const mockClipboard = {
  writeText: jest.fn(),
};
Object.assign(navigator, {
  clipboard: mockClipboard,
});

describe('QRCodeDisplay', () => {
  const defaultProps = {
    qrCode: 'data:image/png;base64,testQRCode',
    secret: 'JBSWY3DPEHPK3PXP',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders QR code image', () => {
    render(<QRCodeDisplay {...defaultProps} />);

    const qrImage = screen.getByAltText('2FA QR Kodu');
    expect(qrImage).toBeInTheDocument();
    expect(qrImage).toHaveAttribute('src', defaultProps.qrCode);
  });

  it('displays formatted secret code', () => {
    render(<QRCodeDisplay {...defaultProps} />);

    // Secret should be formatted with spaces every 4 characters
    const formattedSecret = screen.getByLabelText('Manuel giriş kodu');
    expect(formattedSecret).toBeInTheDocument();
    expect(formattedSecret).toHaveTextContent('JBSW Y3DP EHPK 3PXP');
  });

  it('displays instructions for QR scanning', () => {
    render(<QRCodeDisplay {...defaultProps} />);

    expect(
      screen.getByText(/Google Authenticator veya benzer bir uygulama/i)
    ).toBeInTheDocument();
  });

  it('displays manual entry instructions', () => {
    render(<QRCodeDisplay {...defaultProps} />);

    expect(
      screen.getByText(/QR kodu tarayamıyorsanız/i)
    ).toBeInTheDocument();
  });

  it('copies secret to clipboard when copy button is clicked', async () => {
    mockClipboard.writeText.mockResolvedValueOnce(undefined);
    render(<QRCodeDisplay {...defaultProps} />);

    const copyButton = screen.getByLabelText('Kodu kopyala');
    fireEvent.click(copyButton);

    expect(mockClipboard.writeText).toHaveBeenCalledWith(defaultProps.secret);

    await waitFor(() => {
      expect(screen.getByText('Kod panoya kopyalandı')).toBeInTheDocument();
    });
  });

  it('shows copy success notification', async () => {
    mockClipboard.writeText.mockResolvedValueOnce(undefined);
    render(<QRCodeDisplay {...defaultProps} />);

    const copyButton = screen.getByLabelText('Kodu kopyala');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(screen.getByText('Kod panoya kopyalandı')).toBeInTheDocument();
    });
  });

  it('has accessible copy button', () => {
    render(<QRCodeDisplay {...defaultProps} />);

    const copyButton = screen.getByLabelText('Kodu kopyala');
    expect(copyButton).toBeInTheDocument();
  });
});
