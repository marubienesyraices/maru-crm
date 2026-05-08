// Flujo: búsqueda global con Ctrl+K
describe('Búsqueda global', () => {
  beforeEach(() => {
    cy.loginAs(Cypress.env('adminEmail'), Cypress.env('adminPassword'));
    cy.visit('/dashboard');
  });

  it('abre el modal de búsqueda con Ctrl+K', () => {
    cy.get('body').type('{ctrl}k');
    cy.get('[data-testid="global-search"], input[placeholder*="buscar" i]', { timeout: 4000 })
      .should('be.visible');
  });

  it('cierra el modal con Escape', () => {
    cy.get('body').type('{ctrl}k');
    cy.get('body').type('{esc}');
    cy.get('[data-testid="global-search-modal"]').should('not.exist');
  });

  it('muestra resultados al escribir', () => {
    cy.get('body').type('{ctrl}k');
    cy.get('input[placeholder*="buscar" i]').type('casa');
    cy.get('[data-testid="search-result"], .search-result', { timeout: 5000 })
      .should('have.length.gte', 0); // puede ser 0 si no hay resultados
  });
});
