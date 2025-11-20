// Cypress E2E Tests for Story 1.1 - User Registration
// Test file: cypress/e2e/story-1.1-registration.cy.ts

describe('Story 1.1: User Registration - Final Regression Tests', () => {
  const baseUrl = 'http://localhost:3000';
  const apiBaseUrl = 'http://localhost:3001/api/v1/auth';

  beforeEach(() => {
    cy.visit(`${baseUrl}/register`);
    // Clear any existing registration data
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  describe('Section A: Registration Flow Tests (TC-001 to TC-010)', () => {
    it('TC-001: Valid User Registration - Happy Path', () => {
      const email = `qa-test-001-${Date.now()}@example.com`;
      const password = 'TestPass123!';

      // Fill email
      cy.get('input[name="email"], input[type="email"]').type(email);

      // Fill password
      cy.get('input[name="password"], input[type="password"]').type(password);

      // Check Terms & Conditions
      cy.get('input[name="terms_accepted"], input[data-testid="terms-checkbox"]')
        .check({ force: true });

      // Check KVKK Consent
      cy.get('input[name="kvkk_consent_accepted"], input[data-testid="kvkk-checkbox"]')
        .check({ force: true });

      // Submit form
      cy.get('button[type="submit"], button:contains("Kaydol"), button:contains("Register")')
        .click();

      // Verify success message
      cy.get('.success-message, .alert-success, [data-testid="success-message"]', { timeout: 5000 })
        .should('be.visible')
        .and('contain', 'Kayıt başarılı');

      // Verify redirect to verification pending page
      cy.url().should('include', '/verify-email');
    });

    it('TC-002: Email Validation - Valid Format (plus sign)', () => {
      const email = `valid.user+tag-${Date.now()}@example.co.uk`;

      cy.get('input[type="email"]').type(email);
      cy.get('input[type="password"]').type('TestPass123!');
      cy.get('input[data-testid="terms-checkbox"]').check({ force: true });
      cy.get('input[data-testid="kvkk-checkbox"]').check({ force: true });

      cy.get('button[type="submit"]').click();

      // Should succeed without email validation error
      cy.get('[data-testid="success-message"]', { timeout: 5000 }).should('exist');
    });

    it('TC-003: Email Validation - Invalid Format', () => {
      cy.get('input[type="email"]').type('invalid-email');
      cy.get('input[type="password"]').type('TestPass123!');

      // Try to submit
      cy.get('button[type="submit"]').click();

      // Should show validation error
      cy.get('[data-testid="email-error"], .error-message:contains("email")')
        .should('be.visible')
        .and('contain', 'email');
    });

    it('TC-004: Password Strength - Too Weak', () => {
      const email = `qa-test-004-${Date.now()}@example.com`;

      cy.get('input[type="email"]').type(email);
      cy.get('input[type="password"]').type('test');

      // Check strength indicator shows weak
      cy.get('[data-testid="password-strength"], .password-strength')
        .should('have.class', 'weak')
        .or('contain', 'Weak');

      // Submit should be disabled or show error
      cy.get('button[type="submit"]')
        .should('be.disabled')
        .or(() => {
          cy.get('button[type="submit"]').click();
          cy.get('[data-testid="password-error"]').should('be.visible');
        });
    });

    it('TC-005: Password Strength - Medium', () => {
      const email = `qa-test-005-${Date.now()}@example.com`;

      cy.get('input[type="email"]').type(email);
      cy.get('input[type="password"]').type('Test1234');

      // Check strength indicator shows medium
      cy.get('[data-testid="password-strength"], .password-strength')
        .should('have.class', 'medium')
        .or('contain', 'Medium');
    });

    it('TC-006: Password Strength - Strong', () => {
      const email = `qa-test-006-${Date.now()}@example.com`;

      cy.get('input[type="email"]').type(email);
      cy.get('input[type="password"]').type('TestPass123!');

      // Check strength indicator shows strong
      cy.get('[data-testid="password-strength"], .password-strength')
        .should('have.class', 'strong')
        .or('contain', 'Strong');
    });

    it('TC-007: Terms & Conditions Checkbox Required', () => {
      const email = `qa-test-007-${Date.now()}@example.com`;

      cy.get('input[type="email"]').type(email);
      cy.get('input[type="password"]').type('TestPass123!');
      cy.get('input[data-testid="kvkk-checkbox"]').check({ force: true });
      // DO NOT check terms checkbox

      cy.get('button[type="submit"]').click();

      // Should show error
      cy.get('[data-testid="terms-error"], .error-message:contains("Şartlar")')
        .should('be.visible');
    });

    it('TC-008: KVKK Consent Checkbox Required', () => {
      const email = `qa-test-008-${Date.now()}@example.com`;

      cy.get('input[type="email"]').type(email);
      cy.get('input[type="password"]').type('TestPass123!');
      cy.get('input[data-testid="terms-checkbox"]').check({ force: true });
      // DO NOT check KVKK checkbox

      cy.get('button[type="submit"]').click();

      // Should show error
      cy.get('[data-testid="kvkk-error"], .error-message:contains("KVKK")')
        .should('be.visible');
    });

    it('TC-009: Duplicate Email Error', () => {
      const email = `qa-test-duplicate-${Date.now()}@example.com`;

      // Register first user
      cy.get('input[type="email"]').type(email);
      cy.get('input[type="password"]').type('TestPass123!');
      cy.get('input[data-testid="terms-checkbox"]').check({ force: true });
      cy.get('input[data-testid="kvkk-checkbox"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      // Wait for success
      cy.get('[data-testid="success-message"]', { timeout: 5000 }).should('exist');

      // Return to registration page
      cy.visit(`${baseUrl}/register`);

      // Try to register with same email
      cy.get('input[type="email"]').type(email);
      cy.get('input[type="password"]').type('TestPass123!');
      cy.get('input[data-testid="terms-checkbox"]').check({ force: true });
      cy.get('input[data-testid="kvkk-checkbox"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      // Should show duplicate email error
      cy.get('[data-testid="email-error"], .error-message:contains("zaten kayıtlı")')
        .should('be.visible');
    });

    it('TC-010: Email Verification Link Delivery', () => {
      const email = `qa-test-010-${Date.now()}@example.com`;

      cy.get('input[type="email"]').type(email);
      cy.get('input[type="password"]').type('TestPass123!');
      cy.get('input[data-testid="terms-checkbox"]').check({ force: true });
      cy.get('input[data-testid="kvkk-checkbox"]').check({ force: true });

      // Record time before registration
      const startTime = Date.now();

      cy.get('button[type="submit"]').click();

      // Verify success
      cy.get('[data-testid="success-message"]', { timeout: 5000 }).should('exist');

      // Check email received in Mailpit
      cy.visit('http://localhost:8025');

      // Search for the email (this assumes Mailpit UI - adjust selectors as needed)
      cy.contains(email, { timeout: 10000 }).should('exist');

      // Click on email to view
      cy.contains(email).click();

      // Verify verification link exists
      cy.get('a[href*="/verify-email"], a[href*="token"]', { timeout: 5000 })
        .should('exist');

      // Verify email arrived within acceptable time (< 5 seconds)
      const endTime = Date.now();
      const deliveryTime = (endTime - startTime) / 1000;
      expect(deliveryTime).to.be.lessThan(5);
    });
  });

  describe('Section B: Rate Limiting Tests (TC-026 to TC-030)', () => {
    it('TC-026: First 5 Registrations Succeed', () => {
      for (let i = 1; i <= 5; i++) {
        const email = `qa-rl-${i}-${Date.now()}@example.com`;

        cy.visit(`${baseUrl}/register`);
        cy.get('input[type="email"]').type(email);
        cy.get('input[type="password"]').type('TestPass123!');
        cy.get('input[data-testid="terms-checkbox"]').check({ force: true });
        cy.get('input[data-testid="kvkk-checkbox"]').check({ force: true });
        cy.get('button[type="submit"]').click();

        // Each should succeed
        cy.get('[data-testid="success-message"]', { timeout: 5000 }).should('exist');
      }
    });

    it('TC-027: 6th Registration Returns 429 Rate Limit Error', () => {
      const email = `qa-rl-6-${Date.now()}@example.com`;

      cy.get('input[type="email"]').type(email);
      cy.get('input[type="password"]').type('TestPass123!');
      cy.get('input[data-testid="terms-checkbox"]').check({ force: true });
      cy.get('input[data-testid="kvkk-checkbox"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      // Should show rate limit error
      cy.get('[data-testid="rate-limit-error"], .error-message:contains("fazla"), .error-message:contains("istek")')
        .should('be.visible');
    });

    it('TC-029: X-RateLimit Headers Present in Response', () => {
      const email = `qa-test-029-${Date.now()}@example.com`;

      cy.intercept('POST', '**/auth/register', (req) => {
        req.reply((res) => {
          // Check for rate limit headers
          expect(res.headers['x-ratelimit-limit']).to.exist;
          expect(res.headers['x-ratelimit-remaining']).to.exist;
          expect(res.headers['x-ratelimit-reset']).to.exist;
        });
      }).as('registerRequest');

      cy.get('input[type="email"]').type(email);
      cy.get('input[type="password"]').type('TestPass123!');
      cy.get('input[data-testid="terms-checkbox"]').check({ force: true });
      cy.get('input[data-testid="kvkk-checkbox"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      cy.wait('@registerRequest');
    });
  });

  describe('Section C: reCAPTCHA Tests (TC-031 to TC-035)', () => {
    it('TC-033: Frontend Sends X-Recaptcha-Token Header', () => {
      const email = `qa-test-033-${Date.now()}@example.com`;

      cy.intercept('POST', '**/auth/register', (req) => {
        // Verify reCAPTCHA token is sent
        expect(req.headers['x-recaptcha-token']).to.exist;
        expect(req.headers['x-recaptcha-token']).to.not.be.empty;
      }).as('registerRequest');

      cy.get('input[type="email"]').type(email);
      cy.get('input[type="password"]').type('TestPass123!');
      cy.get('input[data-testid="terms-checkbox"]').check({ force: true });
      cy.get('input[data-testid="kvkk-checkbox"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      cy.wait('@registerRequest');
    });

    it('TC-034: reCAPTCHA Error Shows Turkish Message', () => {
      // Mock reCAPTCHA to fail
      cy.intercept('POST', '**/auth/register', {
        statusCode: 403,
        body: {
          success: false,
          error: {
            code: 'RECAPTCHA_FAILED',
            message: 'Bot algılandı. Lütfen tekrar deneyin.'
          }
        }
      });

      const email = `qa-test-034-${Date.now()}@example.com`;

      cy.get('input[type="email"]').type(email);
      cy.get('input[type="password"]').type('TestPass123!');
      cy.get('input[data-testid="terms-checkbox"]').check({ force: true });
      cy.get('input[data-testid="kvkk-checkbox"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      // Should show Turkish error message
      cy.get('[data-testid="error-message"], .error-message')
        .should('be.visible')
        .and('contain', 'Bot');
    });
  });

  describe('Section D: Security Tests (TC-036 to TC-040)', () => {
    it('TC-036: SQL Injection Protection - Email Field', () => {
      cy.intercept('POST', '**/auth/register', (req) => {
        // The server should validate and reject before any SQL execution
        expect(req.body.email).to.include('" OR "1"="1');
      }).as('registerRequest');

      cy.get('input[type="email"]').type('" OR "1"="1');
      cy.get('input[type="password"]').type('TestPass123!');
      cy.get('input[data-testid="terms-checkbox"]').check({ force: true });
      cy.get('input[data-testid="kvkk-checkbox"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      // Should show validation error, not SQL error
      cy.get('[data-testid="email-error"], .error-message:contains("email")')
        .should('be.visible');

      // Should NOT expose SQL errors
      cy.get('body').should('not.contain', 'syntax error');
      cy.get('body').should('not.contain', 'SQL');
    });

    it('TC-037: XSS Protection - Email Field', () => {
      cy.get('input[type="email"]').type('<script>alert("XSS")</script>@example.com');
      cy.get('input[type="password"]').type('TestPass123!');
      cy.get('input[data-testid="terms-checkbox"]').check({ force: true });
      cy.get('input[data-testid="kvkk-checkbox"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      // Should show validation error
      cy.get('[data-testid="email-error"], .error-message:contains("email")')
        .should('be.visible');

      // Should NOT execute script
      cy.window().then((win) => {
        cy.spy(win, 'alert');
        expect(win.alert).not.to.have.been.called;
      });
    });

    it('TC-039: Password Not in Response Body', () => {
      const email = `qa-test-039-${Date.now()}@example.com`;
      const password = 'TestPass123!';

      cy.intercept('POST', '**/auth/register', (req) => {
        req.reply((res) => {
          // Verify password is not in response
          const responseText = JSON.stringify(res.body);
          expect(responseText).to.not.include(password);
          expect(responseText).to.not.include('password');
        });
      }).as('registerRequest');

      cy.get('input[type="email"]').type(email);
      cy.get('input[type="password"]').type(password);
      cy.get('input[data-testid="terms-checkbox"]').check({ force: true });
      cy.get('input[data-testid="kvkk-checkbox"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      cy.wait('@registerRequest');
    });
  });

  describe('Section E: Performance Tests (TC-041 to TC-043)', () => {
    it('TC-041: Response Time < 200ms (p95)', () => {
      const email = `qa-test-041-${Date.now()}@example.com`;
      let responseTime;

      cy.intercept('POST', '**/auth/register', (req) => {
        const start = Date.now();
        req.reply((res) => {
          responseTime = Date.now() - start;
        });
      }).as('registerRequest');

      cy.get('input[type="email"]').type(email);
      cy.get('input[type="password"]').type('TestPass123!');
      cy.get('input[data-testid="terms-checkbox"]').check({ force: true });
      cy.get('input[data-testid="kvkk-checkbox"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      cy.wait('@registerRequest').then(() => {
        expect(responseTime).to.be.lessThan(200);
      });
    });

    it('TC-042: Email Delivery Time < 5 Seconds', () => {
      const email = `qa-test-042-${Date.now()}@example.com`;
      const startTime = Date.now();

      cy.get('input[type="email"]').type(email);
      cy.get('input[type="password"]').type('TestPass123!');
      cy.get('input[data-testid="terms-checkbox"]').check({ force: true });
      cy.get('input[data-testid="kvkk-checkbox"]').check({ force: true });
      cy.get('button[type="submit"]').click();

      // Verify registration success
      cy.get('[data-testid="success-message"]', { timeout: 5000 }).should('exist');

      // Check Mailpit for email
      cy.visit('http://localhost:8025');
      cy.contains(email, { timeout: 10000 }).should('exist');

      const endTime = Date.now();
      const deliveryTime = (endTime - startTime) / 1000;

      expect(deliveryTime).to.be.lessThan(5);
    });
  });

  describe('Accessibility Tests', () => {
    it('Should have no critical accessibility violations', () => {
      // Import axe-core accessibility testing
      cy.visit(`${baseUrl}/register`);

      // Check page structure
      cy.get('form').should('exist');
      cy.get('input[type="email"]').should('have.attr', 'aria-label').or.have.attr('placeholder');
      cy.get('input[type="password"]').should('have.attr', 'aria-label').or.have.attr('placeholder');

      // Check button is accessible
      cy.get('button[type="submit"]').should('be.visible').and('be.enabled');

      // Check for proper labeling
      cy.get('label[for*="email"], label[for*="password"], label[for*="terms"], label[for*="kvkk"]')
        .should('exist');
    });

    it('Should be keyboard navigable', () => {
      cy.visit(`${baseUrl}/register`);

      // Tab through form
      cy.get('input[type="email"]').tab().should('have.focus');
      cy.get('input[type="password"]').tab().should('have.focus');
      cy.get('input[data-testid="terms-checkbox"]').tab().should('have.focus');
      cy.get('input[data-testid="kvkk-checkbox"]').tab().should('have.focus');
      cy.get('button[type="submit"]').tab().should('have.focus');
    });
  });
});

// Helper command for Tab key
Cypress.Commands.add('tab', { prevSubject: true }, (element) => {
  cy.wrap(element).type('{tab}');
  return cy.focused();
});
