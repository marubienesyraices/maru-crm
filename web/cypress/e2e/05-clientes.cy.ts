// Flujo: listado de contactos, crear contacto, ver detalle
describe('Clientes', () => {
  beforeEach(() => {
    cy.loginAs(Cypress.env('adminEmail'), Cypress.env('adminPassword'));
    cy.visit('/clientes');
  });

  it('muestra el listado de clientes', () => {
    // UI label is "Contactos" (clientes y propietarios unificados)
    cy.contains(/contactos/i).should('be.visible');
  });

  it('navega al formulario de nuevo cliente', () => {
    cy.contains(/nuevo contacto/i).click();
    cy.url().should('include', '/clientes/nuevo');
    cy.get('form').should('be.visible');
  });

  it('crea un cliente nuevo', () => {
    cy.visit('/clientes/nuevo');
    cy.get('input[placeholder*="Nombre completo" i]').first().type('Cliente E2E Test');
    cy.get('input[type="email"]').first().type(`e2e_${Date.now()}@test.com`);
    cy.get('input[placeholder*="5555" i]').first().type('5555-0000');
    cy.get('button[type="submit"]').click();
    cy.contains(/cliente e2e test/i, { timeout: 8000 }).should('be.visible');
  });
});
