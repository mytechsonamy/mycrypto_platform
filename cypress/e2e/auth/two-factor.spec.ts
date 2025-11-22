describe('Two-Factor Authentication Flow (Turkish)', () => {
    beforeEach(() => {
        // Login first using UI (since we rely on internal mocks)
        cy.visit('/login');
        cy.get('input[name="email"]').type('test@example.com');
        cy.get('input[name="password"]').type('Test123!');
        cy.get('button[type="submit"]').click();
        cy.contains('Giriş başarılı! Hoşgeldiniz.').should('be.visible');
    });

    describe('2FA Settings Page', () => {
        it('should display 2FA settings with correct Turkish localization', () => {
            cy.visit('/settings/2fa');

            cy.contains('h1', 'İki Faktörlü Kimlik Doğrulama').should('be.visible');
            cy.contains('Durum:').should('be.visible');
            cy.contains('Devre Dışı').should('be.visible');
            cy.contains('2FA\'yı Etkinleştir').should('be.visible');
        });
    });

    describe('2FA Setup Flow', () => {
        it('should guide user through setup process with localized text', () => {
            cy.visit('/settings/2fa/setup');

            // Step 1: QR Code
            cy.contains('h1', 'İki Faktörlü Kimlik Doğrulama Kurulumu').should('be.visible');
            cy.contains('QR Kodu Tara').should('be.visible');
            cy.contains('Google Authenticator veya benzer bir uygulama ile QR kodunu tarayın').should('be.visible');
            cy.contains('Devam Et').click();

            // Step 2: Verification
            cy.contains('Kodu Doğrula').should('be.visible');
            cy.contains('Authenticator uygulamanızda görüntülenen 6 haneli kodu girin').should('be.visible');
            cy.get('input[aria-label="Doğrulama kodu"]').should('be.visible');

            // Try with valid code (from authApi mock: 123456)
            cy.get('input[aria-label="Doğrulama kodu"]').type('123456');
            cy.contains('Doğrula').click();

            // Should move to Step 3: Backup Codes
            cy.contains('Yedek Kodlar').should('be.visible');
            cy.contains('Bu kodları güvenli bir yerde saklayın').should('be.visible');

            // Checkbox
            cy.contains('Bu kodları kaydettim').click();
            cy.contains('Kurulumu Tamamla').click();

            // Should return to settings
            cy.url().should('include', '/settings/2fa');
            cy.contains('Etkin').should('be.visible');
        });
    });
});
