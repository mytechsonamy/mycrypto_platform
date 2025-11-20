/**
 * Backup Codes Display Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BackupCodesDisplay from './BackupCodesDisplay';

// Mock clipboard API
const mockClipboard = {
  writeText: jest.fn(),
};
Object.assign(navigator, {
  clipboard: mockClipboard,
});

// Mock URL APIs
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();
URL.createObjectURL = mockCreateObjectURL;
URL.revokeObjectURL = mockRevokeObjectURL;

describe('BackupCodesDisplay', () => {
  const defaultCodes = [
    'ABC12-DEF34', 'GHI56-JKL78', 'MNO90-PQR12',
    'STU34-VWX56', 'YZA78-BCD90', 'EFG12-HIJ34',
    'KLM56-NOP78', 'QRS90-TUV12', 'WXY34-ZAB56',
    'CDE78-FGH90',
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateObjectURL.mockReturnValue('blob:test-url');
  });

  it('renders all backup codes', () => {
    render(<BackupCodesDisplay codes={defaultCodes} />);

    defaultCodes.forEach((code) => {
      expect(screen.getByText(code)).toBeInTheDocument();
    });
  });

  it('displays warning message', () => {
    render(<BackupCodesDisplay codes={defaultCodes} />);

    expect(
      screen.getByText(/Bu kodlari guvenli bir yere kaydedin/i)
    ).toBeInTheDocument();
  });

  it('displays copy button', () => {
    render(<BackupCodesDisplay codes={defaultCodes} />);

    const copyButton = screen.getByLabelText('Tum kodlari kopyala');
    expect(copyButton).toBeInTheDocument();
  });

  it('displays download button', () => {
    render(<BackupCodesDisplay codes={defaultCodes} />);

    const downloadButton = screen.getByLabelText('Kodlari indir');
    expect(downloadButton).toBeInTheDocument();
  });

  it('copies all codes to clipboard when copy button is clicked', async () => {
    mockClipboard.writeText.mockResolvedValueOnce(undefined);
    render(<BackupCodesDisplay codes={defaultCodes} />);

    const copyButton = screen.getByLabelText('Tum kodlari kopyala');
    fireEvent.click(copyButton);

    const expectedText = defaultCodes.join('\n');
    expect(mockClipboard.writeText).toHaveBeenCalledWith(expectedText);

    await waitFor(() => {
      expect(screen.getByText('Kodlar panoya kopyalandi')).toBeInTheDocument();
    });
  });

  it('downloads codes when download button is clicked', () => {
    render(<BackupCodesDisplay codes={defaultCodes} />);

    const downloadButton = screen.getByLabelText('Kodlari indir');
    fireEvent.click(downloadButton);

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });

  it('shows confirmation checkbox when showConfirmation is true', () => {
    render(<BackupCodesDisplay codes={defaultCodes} showConfirmation={true} />);

    expect(
      screen.getByText(/Bu kodlari guvenli bir yere kaydettim/i)
    ).toBeInTheDocument();
  });

  it('hides confirmation checkbox when showConfirmation is false', () => {
    render(<BackupCodesDisplay codes={defaultCodes} showConfirmation={false} />);

    expect(
      screen.queryByText(/Bu kodlari guvenli bir yere kaydettim/i)
    ).not.toBeInTheDocument();
  });

  it('enables confirm button when checkbox is checked', () => {
    const onConfirm = jest.fn();
    render(
      <BackupCodesDisplay
        codes={defaultCodes}
        onConfirm={onConfirm}
        showConfirmation={true}
      />
    );

    const confirmButton = screen.getByLabelText('Kurulumu tamamla');
    expect(confirmButton).toBeDisabled();

    const checkbox = screen.getByLabelText('Yedek kodlari kaydettim onay');
    fireEvent.click(checkbox);

    expect(confirmButton).not.toBeDisabled();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = jest.fn();
    render(
      <BackupCodesDisplay
        codes={defaultCodes}
        onConfirm={onConfirm}
        showConfirmation={true}
      />
    );

    const checkbox = screen.getByLabelText('Yedek kodlari kaydettim onay');
    fireEvent.click(checkbox);

    const confirmButton = screen.getByLabelText('Kurulumu tamamla');
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalled();
  });

  it('has accessible code labels', () => {
    render(<BackupCodesDisplay codes={defaultCodes} />);

    defaultCodes.forEach((_, index) => {
      expect(screen.getByLabelText(`Yedek kod ${index + 1}`)).toBeInTheDocument();
    });
  });
});
