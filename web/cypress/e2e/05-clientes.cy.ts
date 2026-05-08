// Flujo: listado de clientes, crear cliente, ver detalle
describe('Clientes', () => {
  beforeEach(() => {
    cy.loginAs(Cypress.env('adminEmail'), Cypress.env('adminPassword'));
    cy.visit('/clientes');
  });

  it('muestra el listado de clientes', () => {
    cy.contains(/clientes/i).should('be.visible');
  });

  it('navega al formulario de nuevo cliente', () => {
    cy.contains(/nuevo cliente|agregar/i).click();
    cy.url().should('include', '/clientes/nuevo');
    cy.get('form').should('be.visible');
  });

  it('crea un cliente nuevo', () => {
    cy.visit('/clientes/nuevo');
    cy.get('input[name="nombre"], input[placeholder*="nombre" i]').first().type('Cliente E2E Test');
    cy.get('input[name="email"], input[type="email"]').first().type(`e2e_${Date.now()}@test.com`);
    cy.get('input[name="telefono"], input[placeholder*="teléfono" i]').first().type('5555-0000');
    cy.get('button[type="submit"]').click();
    cy.contains(/cliente e2e test/i, { timeout: 8000 }).should('be.visible');
  });
});
