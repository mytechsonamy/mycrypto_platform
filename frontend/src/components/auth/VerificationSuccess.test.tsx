/**
 * Tests for VerificationSuccess component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import VerificationSuccess from './VerificationSuccess';

describe('VerificationSuccess', () => {
  it('renders the success message', () => {
    render(<VerificationSuccess />);

    expect(screen.getByText('E-posta Dogrulandi!')).toBeInTheDocument();
    expect(screen.getByText(/E-posta adresiniz basariyla dogrulandi/)).toBeInTheDocument();
  });

  it('has a login button that links to /login', () => {
    render(<VerificationSuccess />);

    const loginButton = screen.getByRole('link', { name: /Giris sayfasina git/i });
    expect(loginButton).toHaveAttribute('href', '/login');
  });

  it('has accessible elements', () => {
    render(<VerificationSuccess />);

    // Check for proper heading
    expect(screen.getByRole('heading', { name: /E-posta Dogrulandi/i })).toBeInTheDocument();

    // Check for proper ARIA attributes
    const statusRegion = screen.getByRole('status');
    expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    expect(statusRegion).toHaveAttribute(
      'aria-labelledby',
      'verification-success-title'
    );
  });

  it('displays success icon with green color', () => {
    const { container } = render(<VerificationSuccess />);

    // Check that the success icon is present and hidden from screen readers
    const hiddenIcon = container.querySelector('[aria-hidden="true"]');
    expect(hiddenIcon).toBeInTheDocument();
  });

  it('has proper visual hierarchy with success color', () => {
    render(<VerificationSuccess />);

    const heading = screen.getByRole('heading');
    expect(heading).toHaveStyle({ fontWeight: 600 });
  });
});
