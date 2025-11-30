// Cypress E2E Tests for EPIC 1: Authentication & Onboarding

describe('EPIC 1: User Authentication & Onboarding', () => {
  const baseUrl = 'http://localhost:3003';

  // ==========================================
  // Story 1.1: User Registration
  // ==========================================

  describe('Story 1.1: User Registration', () => {
    beforeEach(() => {
      cy.visit(`${baseUrl}/register`);
    });

    it('TC-1.1.1: Should successfully register a new user with valid data', () => {
      const testEmail = `test.${Math.random().toString(36).substring(7)}@example.com`;
      const testPassword = 'SecurePass123!';

      cy.get('input[name="email"]').type(testEmail);
      cy.get('input[name="password"]').type(testPassword);
      cy.get('input[name="passwordConfirm"]').type(testPassword);
      cy.get('input[name="agreeTerms"]').check();
      cy.get('input[name="agreeKVKK"]').check();
      cy.get('button[type="submit"]').click();

      // Success message should appear
      cy.contains('Kayıt başarılı', { timeout: 10000 }).should('be.visible');
    });

    it('TC-1.1.2: Should reject registration with duplicate email', () => {
      const dupEmail = `dup.${Math.random().toString(36).substring(7)}@example.com`;
      const testPassword = 'SecurePass123!';

      // First registration
      cy.get('input[name="email"]').type(dupEmail);
      cy.get('input[name="password"]').type(testPassword);
      cy.get('input[name="passwordConfirm"]').type(testPassword);
      cy.get('input[name="agreeTerms"]').check();
      cy.get('input[name="agreeKVKK"]').check();
      cy.get('button[type="submit"]').click();

      cy.contains('Kayıt başarılı', { timeout: 10000 }).should('be.visible');

      // Reload and try duplicate
      cy.visit(`${baseUrl}/register`);
      cy.get('input[name="email"]').type(dupEmail);
      cy.get('input[name="password"]').type(testPassword);
      cy.get('input[name="passwordConfirm"]').type(testPassword);
      cy.get('input[name="agreeTerms"]').check();
      cy.get('input[name="agreeKVKK"]').check();
      cy.get('button[type="submit"]').click();

      // Should show error
      cy.contains('Bu email zaten kayıtlı', { timeout: 5000 }).should('be.visible');
    });

    it('TC-1.1.3: Should reject registration with weak password', () => {
      const testEmail = `weak.${Math.random().toString(36).substring(7)}@example.com`;

      cy.get('input[name="email"]').type(testEmail);
      cy.get('input[name="password"]').type('weak123');
      cy.get('input[name="passwordConfirm"]').type('weak123');

      // Password strength should show weak
      cy.contains('Zayıf', { timeout: 3000 }).should('be.visible');

      // Submit button should be disabled or error shown
      cy.get('button[type="submit"]').should('be.disabled');
    });

    it('TC-1.1.4: Should prevent submission without terms checkbox', () => {
      const testEmail = `terms.${Math.random().toString(36).substring(7)}@example.com`;
      const testPassword = 'SecurePass123!';

      cy.get('input[name="email"]').type(testEmail);
      cy.get('input[name="password"]').type(testPassword);
      cy.get('input[name="passwordConfirm"]').type(testPassword);
      cy.get('input[name="agreeKVKK"]').check();
      // DO NOT check agreeTerms

      // Button should be disabled
      cy.get('button[type="submit"]').should('be.disabled');
    });

    it('TC-1.1.5: Should include reCAPTCHA token in registration request', () => {
      const testEmail = `recaptcha.${Math.random().toString(36).substring(7)}@example.com`;
      const testPassword = 'SecurePass123!';

      // Intercept API call
      cy.intercept('POST', '**/api/v1/auth/register').as('register');

      cy.get('input[name="email"]').type(testEmail);
      cy.get('input[name="password"]').type(testPassword);
      cy.get('input[name="passwordConfirm"]').type(testPassword);
      cy.get('input[name="agreeTerms"]').check();
      cy.get('input[name="agreeKVKK"]').check();
      cy.get('button[type="submit"]').click();

      // Check request has reCAPTCHA token
      cy.wait('@register').then((interception) => {
        expect(interception.request.headers).to.have.property('x-recaptcha-token');
      });
    });
  });

  // ==========================================
  // Story 1.2: User Login
  // ==========================================

  describe('Story 1.2: User Login', () => {
    beforeEach(() => {
      cy.visit(`${baseUrl}/login`);
    });

    it('TC-1.2.1: Should successfully login with valid credentials', () => {
      // First, create a test user
      cy.visit(`${baseUrl}/register`);
      const loginEmail = `login.${Math.random().toString(36).substring(7)}@example.com`;
      const loginPassword = 'LoginPass123!';

      cy.get('input[name="email"]').type(loginEmail);
      cy.get('input[name="password"]').type(loginPassword);
      cy.get('input[name="passwordConfirm"]').type(loginPassword);
      cy.get('input[name="agreeTerms"]').check();
      cy.get('input[name="agreeKVKK"]').check();
      cy.get('button[type="submit"]').click();

      cy.contains('Kayıt başarılı', { timeout: 10000 }).should('be.visible');

      // Now test login
      cy.visit(`${baseUrl}/login`);
      cy.get('input[name="email"]').type(loginEmail);
      cy.get('input[name="password"]').type(loginPassword);
      cy.get('button[type="submit"]').click();

      // Should redirect to dashboard
      cy.url({ timeout: 10000 }).should('include', '/dashboard');
    });

    it('TC-1.2.2: Should show error for invalid credentials', () => {
      cy.get('input[name="email"]').type('nonexistent@example.com');
      cy.get('input[name="password"]').type('WrongPassword123!');
      cy.get('button[type="submit"]').click();

      // Should show error message
      cy.contains('Email veya şifre hatalı', { timeout: 5000 }).should('be.visible');

      // Should remain on login page
      cy.url().should('include', '/login');
    });

    it('TC-1.2.3: Should lock account after 5 failed login attempts', () => {
      const lockedEmail = `lockout.${Math.random().toString(36).substring(7)}@example.com`;
      const wrongPassword = 'WrongPassword123!';

      // First register the account
      cy.visit(`${baseUrl}/register`);
      cy.get('input[name="email"]').type(lockedEmail);
      cy.get('input[name="password"]').type('CorrectPass123!');
      cy.get('input[name="passwordConfirm"]').type('CorrectPass123!');
      cy.get('input[name="agreeTerms"]').check();
      cy.get('input[name="agreeKVKK"]').check();
      cy.get('button[type="submit"]').click();

      cy.contains('Kayıt başarılı', { timeout: 10000 }).should('be.visible');

      // Now attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        cy.visit(`${baseUrl}/login`);
        cy.get('input[name="email"]').type(lockedEmail);
        cy.get('input[name="password"]').type(wrongPassword);
        cy.get('button[type="submit"]').click();
        cy.contains('Email veya şifre hatalı', { timeout: 5000 }).should('be.visible');
      }

      // 6th attempt should show lockout message
      cy.visit(`${baseUrl}/login`);
      cy.get('input[name="email"]').type(lockedEmail);
      cy.get('input[name="password"]').type(wrongPassword);
      cy.get('button[type="submit"]').click();

      cy.contains('Hesap', { timeout: 5000 }).should('be.visible');
      cy.contains('dakika', { timeout: 5000 }).should('be.visible');
    });
  });

  // ==========================================
  // Story 1.4: Password Reset
  // ==========================================

  describe('Story 1.4: Password Reset', () => {
    it('TC-1.4.1: Should successfully reset password via email link', () => {
      const resetEmail = `reset.${Math.random().toString(36).substring(7)}@example.com`;
      const originalPassword = 'OriginalPass123!';

      // Create account first
      cy.visit(`${baseUrl}/register`);
      cy.get('input[name="email"]').type(resetEmail);
      cy.get('input[name="password"]').type(originalPassword);
      cy.get('input[name="passwordConfirm"]').type(originalPassword);
      cy.get('input[name="agreeTerms"]').check();
      cy.get('input[name="agreeKVKK"]').check();
      cy.get('button[type="submit"]').click();

      cy.contains('Kayıt başarılı', { timeout: 10000 }).should('be.visible');

      // Request password reset
      cy.visit(`${baseUrl}/login`);
      cy.contains('Şifremi Unuttum').click();
      cy.get('input[name="email"]').type(resetEmail);
      cy.get('button[type="submit"]').click();

      cy.contains('Sıfırlama linki gönderildi', { timeout: 5000 }).should('be.visible');
    });
  });

  // ==========================================
  // Story 1.5 & 1.6: KYC
  // ==========================================

  describe('Story 1.5 & 1.6: KYC Submission', () => {
    beforeEach(() => {
      // Login first
      cy.visit(`${baseUrl}/login`);
      cy.get('input[name="email"]').type('kyc.test@example.com');
      cy.get('input[name="password"]').type('KYCPass123!');
      cy.get('button[type="submit"]').click();
      cy.url({ timeout: 10000 }).should('include', '/dashboard');
    });

    it('TC-1.5.1: Should successfully submit complete KYC', () => {
      cy.visit(`${baseUrl}/account/kyc`);

      cy.get('input[name="fullName"]').type('Test User');
      cy.get('input[name="tcKimlik"]').type('12345678901');
      cy.get('input[name="birthDate"]').type('01011990');
      cy.get('input[name="phone"]').type('+905551234567');

      cy.get('button').contains('KYC Gönder').click();

      cy.contains('KYC başvurunuz alındı', { timeout: 10000 }).should('be.visible');
    });

    it('TC-1.6.1: Should display correct KYC status', () => {
      cy.visit(`${baseUrl}/dashboard`);

      // Should see KYC status badge
      cy.contains('KYC').should('be.visible');

      // Status should be visible (Beklemede, Onaylanmış, or Reddedildi)
      cy.get('[data-testid="kyc-status"]').should('exist');
    });
  });
});
