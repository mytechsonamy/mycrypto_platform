describe('Wallet Dashboard (Turkish)', () => {
    beforeEach(() => {
        // Login first
        cy.visit('/login');
        cy.get('input[name="email"]').type('test@example.com');
        cy.get('input[name="password"]').type('Test123!');
        cy.get('button[type="submit"]').click();
        cy.contains('Giriş başarılı! Hoşgeldiniz.').should('be.visible');

        // Navigate to wallet
        cy.visit('/wallet');
    });

    it('should display wallet dashboard with correct Turkish localization', () => {
        // Check page title
        cy.contains('h1', 'Cüzdanlarım').should('be.visible');

        // Check refresh button
        cy.contains('button', 'Yenile').should('be.visible');
        cy.contains('Son güncelleme:').should('be.visible');

        // Check portfolio summary
        cy.contains('Toplam Portföy Değeri').should('be.visible');
        cy.contains('farklı varlık').should('be.visible');

        // Check info section
        cy.contains('Bilgilendirme').should('be.visible');
        cy.contains('Bakiyeleriniz her 30 saniyede bir otomatik olarak güncellenir').should('be.visible');
    });

    it('should display balance cards with correct Turkish localization and mock data', () => {
        // Check TRY card (Mock data: 12445.67 Total)
        cy.contains('h3', 'Türk Lirası').should('be.visible');
        cy.contains('12.445,67 ₺').should('be.visible'); // Formatted
        cy.contains('Kullanılabilir:').should('be.visible');
        cy.contains('12.345,67 ₺').should('be.visible');

        // Check buttons
        cy.get('button[aria-label="Türk Lirası yatır"]').should('contain', 'Yatır');
        cy.get('button[aria-label="Türk Lirası çek"]').should('contain', 'Çek');
    });

    it('should show alert when clicking deposit/withdraw', () => {
        // Stub window.alert
        const stub = cy.stub();
        cy.on('window:alert', stub);

        cy.get('button[aria-label="Türk Lirası yatır"]').click().then(() => {
            expect(stub.getCall(0)).to.be.calledWith('TRY yatırma özelliği yakın zamanda eklenecek');
        });

        cy.get('button[aria-label="Türk Lirası çek"]').click().then(() => {
            expect(stub.getCall(1)).to.be.calledWith('TRY çekme özelliği yakın zamanda eklenecek');
        });
    });
});
