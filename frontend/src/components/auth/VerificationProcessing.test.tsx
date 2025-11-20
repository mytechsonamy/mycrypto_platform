/**
 * Tests for VerificationProcessing component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import VerificationProcessing from './VerificationProcessing';

describe('VerificationProcessing', () => {
  it('renders the loading message', () => {
    render(<VerificationProcessing />);

    expect(screen.getByText('Dogrulaniyor...')).toBeInTheDocument();
    expect(screen.getByText(/E-posta adresiniz dogrulaniyor/)).toBeInTheDocument();
  });

  it('shows a loading indicator', () => {
    render(<VerificationProcessing />);

    // Check for CircularProgress by role
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has accessible elements', () => {
    render(<VerificationProcessing />);

    // Check for proper heading
    expect(screen.getByRole('heading', { name: /Dogrulaniyor/i })).toBeInTheDocument();

    // Check for proper ARIA attributes
    const statusRegion = screen.getByRole('status');
    expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    expect(statusRegion).toHaveAttribute(
      'aria-labelledby',
      'verification-processing-title'
    );
  });

  it('hides decorative icon from screen readers', () => {
    render(<VerificationProcessing />);

    // The VerifiedUserIcon should be hidden from screen readers
    const { container } = render(<VerificationProcessing />);
    const hiddenIcon = container.querySelector('[aria-hidden="true"]');
    expect(hiddenIcon).toBeInTheDocument();
  });
});
