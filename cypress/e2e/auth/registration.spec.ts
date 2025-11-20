/**
 * Cypress E2E Test Suite: User Registration (Story 1.1)
 *
 * Feature: User Registration with email/password, password strength validation,
 *          email verification, consent checkboxes, and reCAPTCHA protection
 *
 * Test Coverage:
 * - Happy path scenarios
 * - Input validation (email, password)
 * - Duplicate email handling
 * - Checkbox requirements
 * - Accessibility compliance
 * - Security (XSS/SQL injection)
 */

describe('User Registration - Story 1.1', () => {
  const baseUrl = 'http://localhost:3001';
  const registerUrl = `${baseUrl}/register`;

  beforeEach(() => {
    // Navigate to registration page before each test
    cy.visit(registerUrl);

    // Optional: Mock reCAPTCHA to bypass token verification in tests
    cy.window().then((win) => {
      win.grecaptcha = {
        execute: cy.stub().resolves('mock_recaptcha_token'),
        reset: cy.stub(),
      };
    });
  });

  describe('TC-001: Valid password - All requirements met', () => {
    it('Should successfully register with valid email and strong password', () => {
      const uniqueEmail = `testuser.valid.${Date.now()}@example.com`;

      // Step 1: Navigate to register page (done in beforeEach)
      cy.url().should('include', '/register');

      // Step 2-3: Enter email
      cy.get('input[name="email"]')
        .should('be.visible')
        .should('be.enabled')
        .type(uniqueEmail);

      cy.get('input[name="email"]')
        .should('have.value', uniqueEmail)
        .invoke('val').should('not.be.empty');

      // Step 4-5: Enter strong password
      const strongPassword = 'ValidPass123!';
      cy.get('input[name="password"]')
        .should('be.visible')
        .type(strongPassword);

      // Verify password is masked
      cy.get('input[name="password"]')
        .should('have.attr', 'type', 'password');

      // Step 6: Verify password strength indicator appears
      cy.get('[data-testid="password-strength-indicator"]')
        .should('be.visible');

      // Step 7: Verify strength level shows STRONG
      cy.get('[data-testid="password-strength-label"]')
        .should('contain', 'STRONG');

      cy.get('[data-testid="password-strength-bar"]')
        .should('have.class', 'strength-strong')
        .should('have.css', 'background-color')
        .and('match', /^rgb\(76, 175, 80\)/); // Green color

      // Step 8: Check initial button state (should be disabled)
      cy.get('button[type="submit"]')
        .should('be.disabled')
        .should('have.css', 'opacity', '0.5');

      // Step 9: Check both checkboxes
      cy.get('input[type="checkbox"][name="acceptTerms"]')
        .should('be.visible')
        .check({ force: true })
        .should('be.checked');

      cy.get('input[type="checkbox"][name="acceptKVKK"]')
        .should('be.visible')
        .check({ force: true })
        .should('be.checked');

      // Step 10: Verify Register button is now enabled
      cy.get('button[type="submit"]')
        .should('be.enabled')
        .should('have.css', 'opacity', '1');

      // Step 11: Click Register button
      cy.get('button[type="submit"]')
        .contains(/register|kayıt/i)
        .click();

      // Expected: Success message appears
      cy.get('[role="alert"]')
        .should('be.visible')
        .should('contain', 'Kayıt başarılı')
        .or('contain', 'Registration successful');

      // Verify redirect to confirmation page
      cy.url().should('include', '/verify-email').or('include', '/login');
    });
  });

  describe('TC-002: Valid password - Minimum requirements only', () => {
    it('Should register with minimum valid password (MEDIUM strength)', () => {
      const uniqueEmail = `minreq.${Date.now()}@example.com`;
      const minPassword = 'Qwerty1!'; // 8 chars: uppercase, lowercase, number, special

      cy.get('input[name="email"]').type(uniqueEmail);
      cy.get('input[name="password"]').type(minPassword);

      // Verify strength shows MEDIUM
      cy.get('[data-testid="password-strength-label"]')
        .should('contain', 'MEDIUM')
        .or('contain', 'Orta');

      cy.get('[data-testid="password-strength-bar"]')
        .should('have.class', 'strength-medium');

      // Check checkboxes and register
      cy.get('input[type="checkbox"][name="acceptTerms"]').check({ force: true });
      cy.get('input[type="checkbox"][name="acceptKVKK"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      // Verify success
      cy.get('[role="alert"]').should('contain', 'başarı');
    });
  });

  describe('TC-004: Password too short (7 characters)', () => {
    it('Should reject password shorter than 8 characters', () => {
      const shortPassword = 'Abcd1!'; // 6 chars

      cy.get('input[name="email"]').type(`test.${Date.now()}@example.com`);
      cy.get('input[name="password"]').type(shortPassword);

      // Blur to trigger validation
      cy.get('input[name="password"]').blur();

      // Verify error message
      cy.get('[data-testid="password-error"]')
        .should('be.visible')
        .should('contain', 'en az')
        .and('contain', '8');

      // Verify strength shows WEAK
      cy.get('[data-testid="password-strength-label"]')
        .should('contain', 'WEAK')
        .or('contain', 'Zayıf');

      // Register button should remain disabled
      cy.get('button[type="submit"]').should('be.disabled');
    });
  });

  describe('TC-005: Password missing uppercase letter', () => {
    it('Should reject password without uppercase letters', () => {
      const noUpperPassword = 'lowercase123!';

      cy.get('input[name="email"]').type(`test.${Date.now()}@example.com`);
      cy.get('input[name="password"]').type(noUpperPassword);
      cy.get('input[name="password"]').blur();

      cy.get('[data-testid="password-error"]')
        .should('be.visible')
        .should('contain', 'büyük')
        .or('contain', 'uppercase');

      cy.get('button[type="submit"]').should('be.disabled');
    });
  });

  describe('TC-006: Password missing number', () => {
    it('Should reject password without numeric characters', () => {
      const noNumberPassword = 'ValidPass!';

      cy.get('input[name="email"]').type(`test.${Date.now()}@example.com`);
      cy.get('input[name="password"]').type(noNumberPassword);
      cy.get('input[name="password"]').blur();

      cy.get('[data-testid="password-error"]')
        .should('be.visible')
        .should('contain', 'sayı')
        .or('contain', 'number');

      cy.get('button[type="submit"]').should('be.disabled');
    });
  });

  describe('TC-007: Password missing special character', () => {
    it('Should reject password without special characters', () => {
      const noSpecialPassword = 'ValidPass123';

      cy.get('input[name="email"]').type(`test.${Date.now()}@example.com`);
      cy.get('input[name="password"]').type(noSpecialPassword);
      cy.get('input[name="password"]').blur();

      cy.get('[data-testid="password-error"]')
        .should('be.visible')
        .should('contain', 'özel')
        .or('contain', 'special');

      cy.get('button[type="submit"]').should('be.disabled');
    });
  });

  describe('TC-011 & TC-012: Email validation', () => {
    it('TC-011: Should accept valid email formats', () => {
      const validEmails = [
        'user@example.com',
        'firstname.lastname@example.co.uk',
        'user+tag@example.com',
      ];

      validEmails.forEach((email) => {
        cy.get('input[name="email"]').clear().type(email);
        cy.get('input[name="email"]').blur();

        // No error message should appear
        cy.get('[data-testid="email-error"]').should('not.exist');
      });
    });

    it('TC-012: Should reject invalid email formats', () => {
      const invalidEmails = [
        { email: 'notanemail', reason: 'missing @' },
        { email: '@example.com', reason: 'missing local part' },
        { email: 'user@', reason: 'missing domain' },
        { email: 'user@@example.com', reason: 'double @' },
      ];

      invalidEmails.forEach(({ email }) => {
        cy.get('input[name="email"]').clear().type(email);
        cy.get('input[name="email"]').blur();

        // Error message should appear
        cy.get('[data-testid="email-error"]')
          .should('be.visible')
          .should('contain', 'geçerli')
          .or('contain', 'valid');
      });
    });
  });

  describe('TC-016 & TC-017: Duplicate email handling', () => {
    it('Should prevent registration with duplicate email', () => {
      const duplicateEmail = `duplicate.test.${Date.now()}@example.com`;

      // Register first user
      cy.get('input[name="email"]').type(duplicateEmail);
      cy.get('input[name="password"]').type('ValidPass123!');
      cy.get('input[type="checkbox"][name="acceptTerms"]').check({ force: true });
      cy.get('input[type="checkbox"][name="acceptKVKK"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      // Wait for success
      cy.get('[role="alert"]').should('contain', 'başarı');

      // Return to registration page
      cy.visit(registerUrl);

      // Try to register with same email
      cy.get('input[name="email"]').type(duplicateEmail);
      cy.get('input[name="password"]').type('DifferentPass456!');
      cy.get('input[type="checkbox"][name="acceptTerms"]').check({ force: true });
      cy.get('input[type="checkbox"][name="acceptKVKK"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      // Should show duplicate email error
      cy.get('[role="alert"]')
        .should('be.visible')
        .should('contain', 'zaten kayıtlı')
        .or('contain', 'already registered');
    });

    it('Should be case-insensitive for email duplicates', () => {
      const email = `casesense.${Date.now()}@example.com`;

      // Register with lowercase
      cy.get('input[name="email"]').type(email.toLowerCase());
      cy.get('input[name="password"]').type('ValidPass123!');
      cy.get('input[type="checkbox"][name="acceptTerms"]').check({ force: true });
      cy.get('input[type="checkbox"][name="acceptKVKK"]').check({ force: true });
      cy.get('button[type="submit"]').click();
      cy.get('[role="alert"]').should('contain', 'başarı');

      // Return and try with uppercase
      cy.visit(registerUrl);
      cy.get('input[name="email"]').type(email.toUpperCase());
      cy.get('input[name="password"]').type('ValidPass123!');
      cy.get('input[type="checkbox"][name="acceptTerms"]').check({ force: true });
      cy.get('input[type="checkbox"][name="acceptKVKK"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      // Should reject as duplicate
      cy.get('[role="alert"]').should('contain', 'zaten kayıtlı');
    });
  });

  describe('TC-021 to TC-025: Checkbox and consent requirements', () => {
    it('TC-021: Terms & Conditions checkbox is required', () => {
      cy.get('input[name="email"]').type(`test.${Date.now()}@example.com`);
      cy.get('input[name="password"]').type('ValidPass123!');

      // Leave Terms unchecked
      cy.get('input[type="checkbox"][name="acceptTerms"]').should('not.be.checked');
      cy.get('input[type="checkbox"][name="acceptKVKK"]').check({ force: true });

      // Button should be disabled
      cy.get('button[type="submit"]').should('be.disabled');

      // Check Terms
      cy.get('input[type="checkbox"][name="acceptTerms"]').check({ force: true });
      cy.get('button[type="submit"]').should('be.enabled');
    });

    it('TC-022: KVKK consent checkbox is required', () => {
      cy.get('input[name="email"]').type(`test.${Date.now()}@example.com`);
      cy.get('input[name="password"]').type('ValidPass123!');

      // Check Terms, leave KVKK unchecked
      cy.get('input[type="checkbox"][name="acceptTerms"]').check({ force: true });
      cy.get('input[type="checkbox"][name="acceptKVKK"]').should('not.be.checked');

      // Button should be disabled
      cy.get('button[type="submit"]').should('be.disabled');

      // Check KVKK
      cy.get('input[type="checkbox"][name="acceptKVKK"]').check({ force: true });
      cy.get('button[type="submit"]').should('be.enabled');
    });

    it('TC-023: Both checkboxes required', () => {
      cy.get('input[name="email"]').type(`test.${Date.now()}@example.com`);
      cy.get('input[name="password"]').type('ValidPass123!');

      // Both unchecked - button disabled
      cy.get('button[type="submit"]').should('be.disabled');

      // Check first - still disabled
      cy.get('input[type="checkbox"][name="acceptTerms"]').check({ force: true });
      cy.get('button[type="submit"]').should('be.disabled');

      // Check second - now enabled
      cy.get('input[type="checkbox"][name="acceptKVKK"]').check({ force: true });
      cy.get('button[type="submit"]').should('be.enabled');

      // Uncheck first - disabled again
      cy.get('input[type="checkbox"][name="acceptTerms"]').uncheck({ force: true });
      cy.get('button[type="submit"]').should('be.disabled');
    });

    it('TC-024: Terms & Conditions link accessible', () => {
      // Find and click Terms link
      cy.get('a[href*="terms"]')
        .should('be.visible')
        .click();

      // Should open Terms page
      cy.url().should('include', '/terms');

      // Check for content (v1.0, dated 2025-11-19)
      cy.get('body').should('contain', 'Kullanım Koşulları');
      cy.get('body').should('contain', '2025-11-19').or('contain', 'v1.0');
    });

    it('TC-025: KVKK consent link accessible', () => {
      // Find and click KVKK link
      cy.get('a[href*="kvkk"], a[href*="privacy"], a[href*="gizlilik"]')
        .should('be.visible')
        .click();

      // Should open Privacy policy page
      cy.url().should('include', '/privacy').or('include', '/kvkk').or('include', '/gizlilik');

      // Check for content
      cy.get('body').should('contain', 'KVKK').or('contain', 'Gizlilik');
    });
  });

  describe('TC-028 to TC-030: Password strength indicator', () => {
    it('TC-028: Weak password shows weak indicator', () => {
      cy.get('input[name="password"]').type('Weak1!');

      cy.get('[data-testid="password-strength-label"]')
        .should('contain', 'WEAK')
        .or('contain', 'Zayıf');

      cy.get('[data-testid="password-strength-bar"]')
        .should('have.class', 'strength-weak')
        .should('have.css', 'background-color')
        .and('match', /^rgb\(244, 67, 54\)/); // Red
    });

    it('TC-029: Medium password shows medium indicator', () => {
      cy.get('input[name="password"]').type('Qwerty1!');

      cy.get('[data-testid="password-strength-label"]')
        .should('contain', 'MEDIUM')
        .or('contain', 'Orta');

      cy.get('[data-testid="password-strength-bar"]')
        .should('have.class', 'strength-medium')
        .should('have.css', 'background-color')
        .and('match', /^rgb\(255, 193, 7\)/); // Yellow/Orange
    });

    it('TC-030: Strong password shows strong indicator', () => {
      cy.get('input[name="password"]').type('VeryStr0ng!P@ss#2025');

      cy.get('[data-testid="password-strength-label"]')
        .should('contain', 'STRONG')
        .or('contain', 'Güçlü');

      cy.get('[data-testid="password-strength-bar"]')
        .should('have.class', 'strength-strong')
        .should('have.css', 'background-color')
        .and('match', /^rgb\(76, 175, 80\)/); // Green
    });
  });

  describe('Security Tests - XSS Prevention', () => {
    it('TC-034: XSS attempt in email should be blocked', () => {
      const xssPayload = '<script>alert("XSS")</script>@test.com';

      cy.get('input[name="email"]').type(xssPayload);
      cy.get('input[name="email"]').blur();

      // Should show validation error
      cy.get('[data-testid="email-error"]')
        .should('be.visible')
        .should('contain', 'valid');

      // No script should execute
      cy.on('window:alert', () => {
        throw new Error('XSS vulnerability detected - alert was triggered!');
      });
    });

    it('TC-035: XSS attempt in password should be safely stored', () => {
      const xssPayload = 'Pass123!<img src=x onerror="alert(1)">';

      cy.get('input[name="email"]').type(`test.${Date.now()}@example.com`);
      cy.get('input[name="password"]').type(xssPayload);

      // Password should be masked (no HTML rendering)
      cy.get('input[name="password"]')
        .should('have.attr', 'type', 'password');

      // No alert should trigger
      cy.on('window:alert', () => {
        throw new Error('XSS in password field detected!');
      });
    });
  });

  describe('Accessibility Tests', () => {
    it('TC-047: Form labels properly associated with inputs', () => {
      // Email input should have associated label
      cy.get('label[for="email"]')
        .should('be.visible')
        .should('contain', 'Email');

      cy.get('input#email')
        .should('exist')
        .invoke('attr', 'aria-label')
        .should('not.be.empty');

      // Password input should have associated label
      cy.get('label[for="password"]')
        .should('be.visible')
        .should('contain', 'Şifre')
        .or('contain', 'Password');

      cy.get('input#password')
        .should('exist')
        .invoke('attr', 'aria-label')
        .should('not.be.empty');
    });

    it('TC-048: Form keyboard navigation', () => {
      // Tab to email field
      cy.get('input[name="email"]').focus().should('have.focus');

      // Tab to password field
      cy.get('input[name="password"]').focus().should('have.focus');

      // Tab to checkboxes
      cy.get('input[name="acceptTerms"]').focus().should('have.focus');
      cy.get('input[name="acceptKVKK"]').focus().should('have.focus');

      // Tab to submit button
      cy.get('button[type="submit"]').focus().should('have.focus');

      // Verify visible focus indicator
      cy.get('button[type="submit"]')
        .should('have.css', 'outline')
        .or('have.css', 'box-shadow');
    });

    it('TC-049: Error messages announced to screen readers', () => {
      cy.get('input[name="email"]').type('notanemail');
      cy.get('input[name="email"]').blur();

      // Error should have aria-live for screen reader announcement
      cy.get('[data-testid="email-error"]')
        .should('have.attr', 'role', 'alert')
        .or('have.attr', 'aria-live');
    });

    it('TC-050: Sufficient color contrast', () => {
      // This test validates using axe-core in a separate step
      // Here we verify the presence of text labels (not color-only)

      cy.get('[data-testid="password-strength-label"]')
        .should('be.visible')
        .should('not.be.empty');

      cy.get('button[type="submit"]')
        .should('contain', /register|kayıt/i);

      cy.get('[data-testid="email-error"]').should('contain', /\w+/);
    });

    it('TC-051: Password strength indicator accessible', () => {
      cy.get('input[name="password"]').type('Weak1!');

      cy.get('[data-testid="password-strength-indicator"]')
        .should('have.attr', 'aria-label')
        .or('have.attr', 'aria-describedby');

      // Verify text label exists (not color-only)
      cy.get('[data-testid="password-strength-label"]')
        .should('contain', 'WEAK');
    });

    it('TC-052: Required field indicators accessible', () => {
      // Check for required attribute
      cy.get('input[name="email"]')
        .should('have.attr', 'required');

      // Or check for aria-required
      cy.get('input[name="email"]')
        .should('have.attr', 'aria-required', 'true')
        .or('have.attr', 'required');

      // Verify label indicates required
      cy.get('label[for="email"]')
        .invoke('text')
        .should('match', /\*/);
    });

    it('TC-053: Checkbox labels linked correctly', () => {
      // Click on label text (not checkbox)
      cy.get('label').contains('Kullanım').click();

      // Checkbox should toggle
      cy.get('input[name="acceptTerms"]').should('be.checked');

      cy.get('label').contains('Kullanım').click();
      cy.get('input[name="acceptTerms"]').should('not.be.checked');
    });
  });

  describe('Performance Tests', () => {
    it('TC-054: Page loads within 3 seconds', () => {
      const startTime = Date.now();

      cy.visit(registerUrl);

      cy.get('input[name="email"]').should('be.visible');

      const loadTime = Date.now() - startTime;
      expect(loadTime).to.be.lessThan(3000);
    });

    it('TC-055: Form interaction is responsive', () => {
      const startTime = Date.now();

      cy.get('input[name="password"]').type('TestPass123!');
      cy.get('[data-testid="password-strength-indicator"]').should('be.visible');

      const interactionTime = Date.now() - startTime;
      expect(interactionTime).to.be.lessThan(500);
    });
  });

  describe('Email Verification Flow', () => {
    it('Should send verification email after registration', () => {
      const uniqueEmail = `verify.${Date.now()}@example.com`;

      // Register
      cy.get('input[name="email"]').type(uniqueEmail);
      cy.get('input[name="password"]').type('ValidPass123!');
      cy.get('input[type="checkbox"][name="acceptTerms"]').check({ force: true });
      cy.get('input[type="checkbox"][name="acceptKVKK"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      // Should redirect to verification page
      cy.url().should('include', '/verify-email').or('include', '/check-email');
      cy.get('body').should('contain', 'email').or('contain', 'verify');

      // In real testing, check email via mailhog API
      if (Cypress.env('MAILHOG_API')) {
        cy.request(`${Cypress.env('MAILHOG_API')}/messages`)
          .then((response) => {
            expect(response.status).to.equal(200);
            const verificationEmail = response.body.items.find((item: any) =>
              item.To[0].Mailbox === uniqueEmail.split('@')[0]
            );
            expect(verificationEmail).to.exist;
            expect(verificationEmail.Subject).to.include('verify')
              .or('include', 'doğrula');
          });
      }
    });
  });
});
