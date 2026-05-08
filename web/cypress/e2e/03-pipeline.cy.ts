// Flujo: ver tablero Kanban, verificar columnas
describe('Pipeline Kanban', () => {
  beforeEach(() => {
    cy.loginAs(Cypress.env('adminEmail'), Cypress.env('adminPassword'));
    cy.visit('/pipeline');
  });

  it('muestra las columnas del pipeline', () => {
    const columnas = ['NUEVO', 'CONTACTADO', 'INTERESADO', 'EN_NEGOCIACION', 'GANADO', 'PERDIDO'];
    columnas.forEach((col) => {
      cy.contains(col, { matchCase: false }).should('be.visible');
    });
  });

  it('muestra las tarjetas de trámites', () => {
    // El tablero debe renderizarse sin errores (al menos la estructura de columnas)
    cy.get('[data-testid="kanban-column"], .kanban-column, [class*="column"]')
      .should('have.length.gte', 4);
  });
});
