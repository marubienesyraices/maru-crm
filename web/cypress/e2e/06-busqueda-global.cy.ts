// Flujo: búsqueda global con Ctrl+K
describe('Búsqueda global', () => {
  beforeEach(() => {
    cy.loginAs(Cypress.env('adminEmail'), Cypress.env('adminPassword'));
    cy.visit('/dashboard');
    // Wait until the app shell is interactive (notification bell button is mounted)
    cy.get('.notif-bell-btn', { timeout: 8000 }).should('exist');
  });

  it('abre el modal de búsqueda con Ctrl+K', () => {
    cy.get('body').trigger('keydown', { key: 'k', ctrlKey: true, code: 'KeyK' });
    cy.get('input[aria-label*="Buscar"], input[placeholder*="Buscar"]', { timeout: 5000 })
      .should('be.visible');
  });

  it('cierra el modal con Escape', () => {
    cy.get('body').trigger('keydown', { key: 'k', ctrlKey: true, code: 'KeyK' });
    cy.get('input[aria-label*="Buscar"], input[placeholder*="Buscar"]', { timeout: 5000 }).should('be.visible');
    cy.get('body').trigger('keydown', { key: 'Escape', code: 'Escape' });
    cy.get('input[aria-label*="Buscar"], input[placeholder*="Buscar"]').should('not.exist');
  });

  it('muestra resultados al escribir', () => {
    cy.get('body').trigger('keydown', { key: 'k', ctrlKey: true, code: 'KeyK' });
    cy.get('input[aria-label*="Buscar"], input[placeholder*="Buscar"]', { timeout: 5000 }).type('casa');
    // .gs-results is the results listbox rendered by GlobalSearch
    cy.get('.gs-results, #gs-results-list', { timeout: 5000 }).should('exist');
  });
});
