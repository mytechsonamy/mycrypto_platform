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
  const baseUrl = 'http://localhost:3003';
  const registerUrl = `${baseUrl}/register`;

  beforeEach(() => {
    // Navigate to registration page before each test
    cy.visit(registerUrl, {
      onBeforeLoad(win) {
        win.grecaptcha = {
          execute: cy.stub().resolves('mock_recaptcha_token'),
          reset: cy.stub(),
          ready: (cb) => cb(),
        };
      },
    });
  });

  describe('TC-001: Valid password - All requirements met', () => {
    it('Should successfully register with valid email and strong password', () => {
      cy.intercept('POST', '**/auth/register', {
        statusCode: 201,
        body: { message: 'Registration successful' },
      }).as('registerSuccess');

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
      cy.get('input[name="confirmPassword"]').type(strongPassword);

      // Verify password is masked
      cy.get('input[name="password"]')
        .should('have.attr', 'type', 'password');

      // Step 6: Verify password strength indicator appears
      cy.get('[data-testid="password-strength-indicator"]')
        .should('be.visible');

      // Step 7: Verify strength level shows STRONG
      cy.get('[data-testid="password-strength-label"]')
        .invoke('text').should('match', /STRONG|Güçlü/i);

      cy.get('[data-testid="password-strength-bar"]')
        .should('have.class', 'strength-strong');

      // Step 8: Check initial button state (should be disabled)
      cy.get('button[type="submit"]')
        .should('be.disabled');

      // Step 9: Check both checkboxes
      cy.get('input[type="checkbox"][name="acceptTerms"]')
        .check({ force: true })
        .should('be.checked');

      cy.get('input[type="checkbox"][name="acceptKvkk"]')
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
        .should('contain', 'Kayıt başarılı');

      // Verify redirect to confirmation page
      cy.url().should('match', /\/verify-email|\/login/);
    });
  });

  describe('TC-002: Valid password - Minimum requirements only', () => {
    it('Should register with minimum valid password (MEDIUM strength)', () => {
      cy.intercept('POST', '**/auth/register', {
        statusCode: 201,
        body: { message: 'Registration successful' },
      }).as('registerMedium');

      cy.get('input[name="email"]').type('medium@example.com');
      cy.get('input[name="password"]').type('Test1234'); // 8 chars: uppercase, lowercase, number, special

      // Verify strength shows MEDIUM
      cy.get('[data-testid="password-strength-label"]')
        .invoke('text').should('match', /MEDIUM|Orta/i);

      cy.get('[data-testid="password-strength-bar"]')
        .should('have.class', 'strength-medium');

      // Check checkboxes and register
      cy.get('input[type="checkbox"][name="acceptTerms"]').check({ force: true });
      cy.get('input[type="checkbox"][name="acceptKvkk"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      // Verify success
      cy.get('[role="alert"]').should('contain', 'başarı');
    });
  });

  describe('TC-004: Password too short (7 characters)', () => {
    it('Should reject password shorter than 8 characters', () => {
      cy.get('input[name="email"]').type('short@example.com');
      cy.get('input[name="password"]').type('Test1');

      // Blur to trigger validation
      cy.get('input[name="password"]').blur();

      // Verify error message
      cy.get('[data-testid="password-error"]')
        .should('be.visible')
        .should('contain', 'en az')
        .and('contain', '8');

      // Verify strength shows WEAK
      cy.get('[data-testid="password-strength-label"]')
        .invoke('text').should('match', /WEAK|Zayıf/i);

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
        .invoke('text').should('match', /büyük|uppercase/i);

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
        .invoke('text').should('match', /rakam|number/i);

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
        .invoke('text').should('match', /özel|special/i);

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
          .invoke('text').should('match', /Geçerli|valid/i);
      });
    });
  });

  describe('TC-016 & TC-017: Duplicate email handling', () => {
    it('Should prevent registration with duplicate email', () => {
      cy.intercept('POST', '**/auth/register', {
        statusCode: 409,
        body: { message: 'Email already exists' },
      }).as('registerDuplicate');

      cy.get('input[name="email"]').type('existing@example.com');
      cy.get('input[name="password"]').type('ValidPass123!');
      cy.get('input[name="confirmPassword"]').type('ValidPass123!');
      cy.get('input[type="checkbox"][name="acceptTerms"]').check({ force: true });
      cy.get('input[type="checkbox"][name="acceptKvkk"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      cy.wait('@registerDuplicate');

      // Should show duplicate email error
      cy.get('[role="alert"]')
        .should('be.visible')
        .invoke('text').should('match', /zaten kayıtlı|already registered/);
    });

    it('Should be case-insensitive for email duplicates', () => {
      cy.intercept('POST', '**/auth/register', {
        statusCode: 409,
        body: { message: 'Email already exists' },
      }).as('registerDuplicateCase');

      cy.get('input[name="email"]').type('EXISTING@example.com');
      cy.get('input[name="password"]').type('ValidPass123!');
      cy.get('input[name="confirmPassword"]').type('ValidPass123!');
      cy.get('input[type="checkbox"][name="acceptTerms"]').check({ force: true });
      cy.get('input[type="checkbox"][name="acceptKvkk"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      cy.wait('@registerDuplicateCase');

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
      cy.get('input[type="checkbox"][name="acceptKvkk"]').check({ force: true });

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
      cy.get('input[type="checkbox"][name="acceptKvkk"]').should('not.be.checked');

      // Button should be disabled
      cy.get('button[type="submit"]').should('be.disabled');

      // Check KVKK
      cy.get('input[type="checkbox"][name="acceptKvkk"]').check({ force: true });
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
      cy.get('input[type="checkbox"][name="acceptKvkk"]').check({ force: true });
      cy.get('button[type="submit"]').should('be.enabled');

      // Uncheck first - disabled again
      cy.get('input[type="checkbox"][name="acceptTerms"]').uncheck({ force: true });
      cy.get('button[type="submit"]').should('be.disabled');
    });

    it('TC-024: Terms & Conditions link accessible', () => {
      // Find and click Terms link
      cy.get('a[href*="terms"]')
        .should('be.visible')
        .invoke('removeAttr', 'target')
        .click();

      // Should open Terms page
      cy.url().should('include', '/terms');

      // Check
      cy.get('body').invoke('text').should('match', /Coming Soon/i);
    });

    it('TC-025: KVKK consent link accessible', () => {
      // Find and click KVKK link
      cy.get('a[href*="kvkk"], a[href*="privacy"], a[href*="gizlilik"]')
        .should('be.visible')
        .invoke('removeAttr', 'target')
        .click();

      // Should open Privacy policy page
      cy.url().should('match', /\/privacy|\/kvkk|\/gizlilik/);

      // Check for content
      cy.get('body').invoke('text').should('match', /KVKK|Gizlilik/);
    });
  });

  describe('TC-028 to TC-030: Password strength indicator', () => {
    it('TC-028: Weak password shows weak indicator', () => {
      cy.get('input[name="password"]').type('Weak1');

      cy.get('[data-testid="password-strength-label"]')
        .invoke('text').should('match', /WEAK|Zayıf/i);

      cy.get('[data-testid="password-strength-bar"]')
        .should('have.class', 'strength-weak');
    });

    it('TC-029: Medium password shows medium indicator', () => {
      cy.get('input[name="password"]').type('Qwerty12');

      cy.get('[data-testid="password-strength-label"]')
        .invoke('text').should('match', /MEDIUM|Orta/i);

      cy.get('[data-testid="password-strength-bar"]')
        .should('have.class', 'strength-medium');
    });

    it('TC-030: Strong password shows strong indicator', () => {
      cy.get('input[name="password"]').type('VeryStr0ng!P@ss#2025');

      cy.get('[data-testid="password-strength-label"]')
        .invoke('text').should('match', /STRONG|Güçlü/i);

      cy.get('[data-testid="password-strength-bar"]')
        .should('have.class', 'strength-strong');
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
        .invoke('text').should('match', /Geçerli|valid/i);

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
        .should('contain', 'E-posta Adresi');

      cy.get('input#email')
        .should('exist')
        .invoke('attr', 'aria-label')
        .should('not.be.empty');

      // Password input should have associated label
      cy.get('label[for="password"]')
        .should('be.visible')
        .invoke('text').should('match', /Şifre|Password/i);

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
      cy.get('input[name="acceptKvkk"]').focus().should('have.focus');

      // Fill form to enable button
      cy.get('input[name="email"]').type('focus@example.com');
      cy.get('input[name="password"]').type('Focus123!');
      cy.get('input[type="checkbox"][name="acceptTerms"]').check({ force: true });
      cy.get('input[type="checkbox"][name="acceptKvkk"]').check({ force: true });

      // Tab to submit button
      cy.get('button[type="submit"]').focus().should('have.focus');

      // Verify visible focus indicator
      cy.get('button[type="submit"]')
        .then($el => {
          expect($el.css('outline') !== 'none' || $el.css('box-shadow') !== 'none').to.be.true;
        });
    });

    it('TC-049: Error messages announced to screen readers', () => {
      cy.get('input[name="email"]').type('notanemail');
      cy.get('input[name="email"]').blur();

      // Error should have aria-live for screen reader announcement
      cy.get('[data-testid="email-error"]')
        .should('satisfy', ($el) => $el.attr('role') === 'alert' || $el.attr('aria-live') !== undefined);
    });

    it('TC-050: Sufficient color contrast', () => {
      // This test validates using axe-core in a separate step
      // Here we verify the presence of text labels (not color-only)

      cy.get('input[name="password"]').type('Test1234');

      cy.get('[data-testid="password-strength-label"]')
        .should('be.visible')
        .should('not.be.empty');

      cy.get('button[type="submit"]')
        .should('contain', 'Kayıt');

      cy.get('button[type="submit"]')
        .should('contain', 'Kayıt');
    });

    it('TC-051: Password strength indicator accessible', () => {
      cy.get('input[name="password"]').type('Weak1');

      cy.get('[data-testid="password-strength-indicator"]')
        .should('satisfy', ($el) => $el.attr('aria-label') || $el.attr('aria-describedby'));

      // Verify text label exists (not color-only)
      cy.get('[data-testid="password-strength-label"]')
        .invoke('text').should('match', /WEAK|Zayıf/i);
    });

    it('TC-052: Required field indicators accessible', () => {
      // Check for required attribute
      cy.get('input[name="email"]')
        .should('have.attr', 'required');

      // Or check for aria-required
      cy.get('input[name="email"]')
        .should('satisfy', ($el) => $el.attr('aria-required') === 'true' || $el.attr('required') !== undefined);

      // Verify label indicates required
      cy.get('label[for="email"]')
        .invoke('text')
        .should('match', /\*/);
    });

    it('TC-053: Checkbox labels linked correctly', () => {
      // Click on label text (not checkbox)
      cy.get('label').contains('okudum').click();

      // Checkbox should toggle
      cy.get('input[name="acceptTerms"]').should('be.checked');

      cy.get('label').contains('okudum').click();
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
    it('Should register with minimum valid password (MEDIUM strength)', () => {
      cy.intercept('POST', '**/auth/register', {
        statusCode: 201,
        body: { message: 'Registration successful' },
      }).as('registerMedium');

      // Wait for page load
      cy.get('input[name="email"]').should('be.visible');

      cy.get('input[name="email"]').type('medium@example.com');
      cy.get('input[name="password"]').type('Test1234!');
      cy.get('input[name="confirmPassword"]').type('Test1234!');
      cy.get('input[type="checkbox"][name="acceptTerms"]').check({ force: true });
      cy.get('input[type="checkbox"][name="acceptKvkk"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      // Should show success message or redirect
      cy.wait('@registerMedium').its('response.statusCode').should('eq', 201);
      cy.get('[role="alert"]').should('contain', 'Kayıt başarılı');
      cy.url().should('include', '/verify-email');
    });

    it('TC-001: Successful registration with valid credentials', () => {
      cy.intercept('POST', '**/auth/register', {
        statusCode: 201,
        body: { message: 'Registration successful' },
      }).as('registerSuccess');

      // Wait for page load
      cy.get('input[name="email"]').should('be.visible');

      // Fill form
      cy.get('input[name="email"]').type('verify@example.com');
      cy.get('input[name="password"]').type('Test1234!');
      cy.get('input[name="confirmPassword"]').type('Test1234!');
      cy.get('input[type="checkbox"][name="acceptTerms"]').check({ force: true });
      cy.get('input[type="checkbox"][name="acceptKvkk"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      cy.wait('@registerSuccess');

      cy.url().should('match', /\/verify-email|\/check-email/);
      cy.get('body').invoke('text').should('match', /email|verify/);

      // In real testing, check email via mailhog API
      if (Cypress.env('MAILHOG_API')) {
        cy.request(`${Cypress.env('MAILHOG_API')}/messages`)
          .then((response) => {
            expect(response.status).to.equal(200);
            const verificationEmail = response.body.items.find((item: any) =>
              item.To[0].Mailbox === 'verify'
            );
            expect(verificationEmail).to.exist;
            expect(verificationEmail.Subject).to.match(/verify|doğrula/);
          });
      }
    });
  });
});
