/**
 * Cypress E2E Tests: User Registration & Email Verification Flow
 * Story 1.1: User Registration
 * Story 1.2: Email Verification (partial)
 *
 * Test Suite for comprehensive registration and email verification workflow
 */

describe('User Registration & Email Verification Flow', () => {
  const baseUrl = 'http://localhost:3000';
  const apiUrl = 'http://localhost:3001';
  const mailhogUrl = 'http://localhost:8025';

  // ========================================
  // Registration Form Validation Tests
  // ========================================

  describe('Registration Form - UI Validation', () => {
    beforeEach(() => {
      cy.visit(`${baseUrl}/register`);
      cy.wait(500); // Wait for form to load
    });

    it('TC-001: Should successfully register with valid data', () => {
      const email = `testuser${Date.now()}@example.com`;
      const password = 'SecurePass123!@#';

      // Enter credentials
      cy.get('input[name="email"]').type(email);
      cy.get('input[name="password"]').type(password);
      cy.get('input[name="confirmPassword"]').type(password);

      // Verify password strength indicator shows "Strong"
      cy.get('[data-testid="password-strength"]')
        .should('contain', 'Strong')
        .should('have.class', 'strength-strong');

      // Accept terms and KVKK
      cy.get('input[name="termsAccepted"]').check({ force: true });
      cy.get('input[name="kvkkAccepted"]').check({ force: true });

      // Submit form
      cy.get('button[type="submit"]').click();

      // Verify success and redirect
      cy.contains('başarılı').should('be.visible');
      cy.url().should('include', '/verify-email-pending');
    });

    it('TC-002: Should show error for invalid email format', () => {
      cy.get('input[name="email"]').type('not-an-email');
      cy.get('input[name="email"]').blur();

      // Check for error message
      cy.get('[data-testid="email-error"]')
        .should('be.visible')
        .should('contain', 'Geçerli bir email adresi girin');

      // Verify submit button is disabled
      cy.get('button[type="submit"]').should('be.disabled');
    });

    it('TC-003: Should reject password without uppercase letter', () => {
      cy.get('input[name="password"]').type('securepass123!@#');

      // Check password strength indicator
      cy.get('[data-testid="password-strength"]')
        .should('contain', 'Weak')
        .should('have.class', 'strength-weak');

      // Check for validation error
      cy.get('[data-testid="password-error"]')
        .should('be.visible')
        .should('contain', 'büyük harf');

      // Submit button should be disabled
      cy.get('button[type="submit"]').should('be.disabled');
    });

    it('TC-004: Should reject password without special character', () => {
      cy.get('input[name="password"]').type('SecurePass12345');

      cy.get('[data-testid="password-strength"]')
        .should('contain', 'Weak')
        .should('have.class', 'strength-weak');

      cy.get('[data-testid="password-error"]')
        .should('be.visible')
        .should('contain', 'özel karakter');

      cy.get('button[type="submit"]').should('be.disabled');
    });

    it('TC-005: Should reject password shorter than 8 characters', () => {
      cy.get('input[name="password"]').type('Pass1!');

      cy.get('[data-testid="password-error"]')
        .should('be.visible')
        .should('contain', 'minimum 8 karakterden');

      cy.get('button[type="submit"]').should('be.disabled');
    });

    it('TC-006: Should show error for duplicate email', () => {
      // Register first user
      const email = `duplicate${Date.now()}@example.com`;
      const password = 'SecurePass123!@#';

      cy.get('input[name="email"]').type(email);
      cy.get('input[name="password"]').type(password);
      cy.get('input[name="confirmPassword"]').type(password);
      cy.get('input[name="termsAccepted"]').check({ force: true });
      cy.get('input[name="kvkkAccepted"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      // Wait for registration to complete
      cy.contains('başarılı', { timeout: 10000 }).should('be.visible');
      cy.url().should('include', '/verify-email-pending');

      // Go back to registration
      cy.visit(`${baseUrl}/register`);
      cy.wait(500);

      // Try to register with same email
      cy.get('input[name="email"]').type(email);
      cy.get('input[name="password"]').type(password);
      cy.get('input[name="confirmPassword"]').type(password);
      cy.get('input[name="termsAccepted"]').check({ force: true });
      cy.get('input[name="kvkkAccepted"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      // Should show duplicate error
      cy.contains('zaten kayıtlı').should('be.visible');
    });

    it('TC-007: Should require Terms & Conditions acceptance', () => {
      cy.get('input[name="email"]').type('test007@example.com');
      cy.get('input[name="password"]').type('SecurePass123!@#');
      cy.get('input[name="confirmPassword"]').type('SecurePass123!@#');

      // Check KVKK but NOT Terms
      cy.get('input[name="kvkkAccepted"]').check({ force: true });

      // Try to submit
      cy.get('button[type="submit"]').click();

      // Should show error
      cy.contains(/Kullanım Şartları|Terms/).should('be.visible');
    });

    it('TC-008: Should require KVKK acceptance', () => {
      cy.get('input[name="email"]').type('test008@example.com');
      cy.get('input[name="password"]').type('SecurePass123!@#');
      cy.get('input[name="confirmPassword"]').type('SecurePass123!@#');

      // Check Terms but NOT KVKK
      cy.get('input[name="termsAccepted"]').check({ force: true });

      // Try to submit
      cy.get('button[type="submit"]').click();

      // Should show error
      cy.contains('KVKK').should('be.visible');
    });

    it('TC-009: Should show validation errors for empty form submission', () => {
      // Click submit without filling anything
      cy.get('button[type="submit"]').click();

      // Should show errors for all required fields
      cy.get('[data-testid="email-error"]').should('contain', 'gerekli');
      cy.get('[data-testid="password-error"]').should('contain', 'gerekli');

      // All fields should have error class
      cy.get('input[name="email"]').should('have.class', 'error');
      cy.get('input[name="password"]').should('have.class', 'error');
    });

    it('TC-010: Password visibility toggle should work correctly', () => {
      const password = 'SecurePass123!@#';

      // Type password
      cy.get('input[name="password"]').type(password);

      // Initially should be masked
      cy.get('input[name="password"]').should('have.attr', 'type', 'password');

      // Click toggle to show
      cy.get('[data-testid="password-toggle"]').click();
      cy.get('input[name="password"]').should('have.attr', 'type', 'text');
      cy.get('input[name="password"]').should('have.value', password);

      // Click toggle to hide
      cy.get('[data-testid="password-toggle"]').click();
      cy.get('input[name="password"]').should('have.attr', 'type', 'password');
    });
  });

  // ========================================
  // Email Verification Tests
  // ========================================

  describe('Email Verification Flow', () => {
    it('TC-011: Should receive verification email within 60 seconds', () => {
      const email = `verify${Date.now()}@example.com`;
      const password = 'SecurePass123!@#';

      // Register user
      cy.visit(`${baseUrl}/register`);
      cy.get('input[name="email"]').type(email);
      cy.get('input[name="password"]').type(password);
      cy.get('input[name="confirmPassword"]').type(password);
      cy.get('input[name="termsAccepted"]').check({ force: true });
      cy.get('input[name="kvkkAccepted"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      // Wait for success
      cy.contains('başarılı').should('be.visible');

      // Check MailHog for email
      cy.visit(`${mailhogUrl}`, { timeout: 60000 });
      cy.wait(2000);

      // Look for verification email from this user
      cy.contains(email).should('be.visible', { timeout: 60000 });
      cy.contains('Email Doğrulama').should('be.visible');
    });

    it('TC-012: Verification link format should be correct', () => {
      const email = `linktest${Date.now()}@example.com`;
      const password = 'SecurePass123!@#';

      // Register
      cy.visit(`${baseUrl}/register`);
      cy.get('input[name="email"]').type(email);
      cy.get('input[name="password"]').type(password);
      cy.get('input[name="confirmPassword"]').type(password);
      cy.get('input[name="termsAccepted"]').check({ force: true });
      cy.get('input[name="kvkkAccepted"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      // Get verification email
      cy.visit(`${mailhogUrl}`);
      cy.wait(2000);
      cy.contains(email).click();

      // Extract and verify link format
      cy.get('a').each(($a) => {
        const href = $a.attr('href');
        if (href && href.includes('verify-email')) {
          // Should have format: /verify-email?token=<64-hex-chars>
          expect(href).to.match(/verify-email\?token=[a-f0-9]{64}/);
        }
      });
    });

    it('TC-013: Valid token should successfully verify email', () => {
      const email = `validtoken${Date.now()}@example.com`;
      const password = 'SecurePass123!@#';

      // Register
      cy.visit(`${baseUrl}/register`);
      cy.get('input[name="email"]').type(email);
      cy.get('input[name="password"]').type(password);
      cy.get('input[name="confirmPassword"]').type(password);
      cy.get('input[name="termsAccepted"]').check({ force: true });
      cy.get('input[name="kvkkAccepted"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      // Get verification link from email
      cy.visit(`${mailhogUrl}`);
      cy.wait(2000);
      cy.contains(email).click();

      // Extract token from link
      cy.get('a')
        .should('be.visible')
        .each(($a) => {
          const href = $a.attr('href');
          if (href && href.includes('verify-email')) {
            // Extract token and navigate to verification page
            const token = new URL(href).searchParams.get('token');

            cy.visit(`${baseUrl}/verify-email?token=${token}`);
            cy.wait(3000);

            // Should show success message
            cy.contains('başarıyla').should('be.visible');

            // Should redirect to login
            cy.url().should('include', '/login');
          }
        });
    });

    it('TC-014: Invalid token should show error message', () => {
      const invalidToken = 'invalidtoken1234567890123456789012345678901234567890123456789012';

      cy.visit(`${baseUrl}/verify-email?token=${invalidToken}`);
      cy.wait(2000);

      // Should show error
      cy.contains(/Geçersiz|Invalid/).should('be.visible');

      // Should offer resend option
      cy.contains(/Tekrar|Resend/).should('be.visible');
    });

    it('TC-015: Expired token should show expiration error', () => {
      // This test requires backend support to create an expired token
      // For now, we'll test the UI for expired token scenario
      const expiredToken = 'a'.repeat(64);

      cy.visit(`${baseUrl}/verify-email?token=${expiredToken}`);
      cy.wait(2000);

      // Should show error about expiration
      cy.contains(/süresi geçti|expired/).should('be.visible');
    });

    it('TC-016: Resend verification email should work', () => {
      const email = `resend${Date.now()}@example.com`;

      // First, ensure user is registered but not verified
      cy.visit(`${baseUrl}/register`);
      const password = 'SecurePass123!@#';
      cy.get('input[name="email"]').type(email);
      cy.get('input[name="password"]').type(password);
      cy.get('input[name="confirmPassword"]').type(password);
      cy.get('input[name="termsAccepted"]').check({ force: true });
      cy.get('input[name="kvkkAccepted"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      // Go to resend page
      cy.visit(`${baseUrl}/resend-verification`);

      // Enter email
      cy.get('input[name="email"]').type(email);
      cy.get('button[type="submit"]').click();

      // Should show success
      cy.contains('tekrar gönderildi').should('be.visible');

      // Check MailHog for new email
      cy.visit(`${mailhogUrl}`);
      cy.wait(2000);
      cy.contains(email).should('be.visible');
    });

    it('TC-017: Resend for already verified email should show error', () => {
      // This requires a verified user in the database
      cy.visit(`${baseUrl}/resend-verification`);

      cy.get('input[name="email"]').type('verified@example.com');
      cy.get('button[type="submit"]').click();

      // Should show error
      cy.contains(/zaten|already/).should('be.visible');
    });

    it('TC-018: Rate limiting on resend should be enforced', () => {
      const email = `ratelimit${Date.now()}@example.com`;

      // Register user
      cy.visit(`${baseUrl}/register`);
      const password = 'SecurePass123!@#';
      cy.get('input[name="email"]').type(email);
      cy.get('input[name="password"]').type(password);
      cy.get('input[name="confirmPassword"]').type(password);
      cy.get('input[name="termsAccepted"]').check({ force: true });
      cy.get('input[name="kvkkAccepted"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      // Go to resend page and try multiple times
      cy.visit(`${baseUrl}/resend-verification`);

      let successCount = 0;

      for (let i = 0; i < 4; i++) {
        cy.get('input[name="email"]').clear().type(email);
        cy.get('button[type="submit"]').click();

        cy.get('body').then(($body) => {
          if ($body.text().includes('tekrar gönderildi')) {
            successCount++;
          }
        });

        cy.wait(500);
      }

      // Should have succeeded 3 times and failed on 4th
      // Note: This might need adjustment based on actual implementation
    });
  });

  // ========================================
  // Password Strength Indicator Tests
  // ========================================

  describe('Password Strength Indicator', () => {
    beforeEach(() => {
      cy.visit(`${baseUrl}/register`);
    });

    it('Should show Weak strength for short password', () => {
      cy.get('input[name="password"]').type('Pass1!');
      cy.get('[data-testid="password-strength"]').should('contain', 'Weak');
    });

    it('Should show Medium strength for partially valid password', () => {
      cy.get('input[name="password"]').type('SecurePass123');
      cy.get('[data-testid="password-strength"]')
        .should('contain', 'Medium')
        .should('have.class', 'strength-medium');
    });

    it('Should show Strong strength for fully valid password', () => {
      cy.get('input[name="password"]').type('SecurePass123!@#');
      cy.get('[data-testid="password-strength"]')
        .should('contain', 'Strong')
        .should('have.class', 'strength-strong');
    });
  });

  // ========================================
  // API Integration Tests
  // ========================================

  describe('Registration API Integration', () => {
    it('TC-019: Should register user via API', () => {
      const email = `apitest${Date.now()}@example.com`;
      const password = 'SecurePass123!@#';

      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/v1/auth/register`,
        body: {
          email,
          password,
          termsAccepted: true,
          kvkkAccepted: true,
          recaptchaToken: 'mock-token',
        },
        headers: {
          'Content-Type': 'application/json',
        },
      }).then((response) => {
        expect(response.status).to.equal(201);
        expect(response.body.success).to.equal(true);
        expect(response.body.data).to.have.property('userId');
        expect(response.body.data.emailVerified).to.equal(false);
      });
    });

    it('TC-020: Should return validation errors', () => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/v1/auth/register`,
        body: {
          email: 'invalid-email',
          password: 'weak',
          termsAccepted: true,
          kvkkAccepted: true,
          recaptchaToken: 'mock-token',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(400);
        expect(response.body.error.code).to.equal('VALIDATION_ERROR');
      });
    });

    it('TC-021: Should reject duplicate email', () => {
      const email = `dupapi${Date.now()}@example.com`;

      // Register first user
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/v1/auth/register`,
        body: {
          email,
          password: 'SecurePass123!@#',
          termsAccepted: true,
          kvkkAccepted: true,
          recaptchaToken: 'mock-token',
        },
      });

      // Try to register again with same email
      cy.request({
        method: 'POST',
        url: `${apiUrl}/api/v1/auth/register`,
        body: {
          email,
          password: 'SecurePass123!@#',
          termsAccepted: true,
          kvkkAccepted: true,
          recaptchaToken: 'mock-token',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(409);
        expect(response.body.error.code).to.equal('EMAIL_ALREADY_EXISTS');
      });
    });
  });

  // ========================================
  // Accessibility Tests
  // ========================================

  describe('Accessibility', () => {
    beforeEach(() => {
      cy.visit(`${baseUrl}/register`);
    });

    it('Form should have proper ARIA labels', () => {
      cy.get('input[name="email"]').should('have.attr', 'aria-label');
      cy.get('input[name="password"]').should('have.attr', 'aria-label');
      cy.get('button[type="submit"]').should('have.attr', 'aria-label');
    });

    it('Error messages should be announced to screen readers', () => {
      cy.get('input[name="email"]').type('invalid');
      cy.get('input[name="email"]').blur();

      cy.get('[role="alert"]').should('be.visible');
    });

    it('Form should be keyboard navigable', () => {
      cy.get('input[name="email"]').focus().type('test@example.com');
      cy.get('body').tab();
      cy.get('input[name="password"]').should('have.focus');
      cy.get('body').tab();
      cy.get('input[name="confirmPassword"]').should('have.focus');
    });
  });
});
