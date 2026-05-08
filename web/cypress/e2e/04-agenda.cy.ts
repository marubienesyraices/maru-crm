// Flujo: ver agenda, navegación semanal
describe('Agenda', () => {
  beforeEach(() => {
    cy.loginAs(Cypress.env('adminEmail'), Cypress.env('adminPassword'));
    cy.visit('/agenda');
  });

  it('muestra la vista semanal con 7 columnas de días', () => {
    cy.contains(/agenda|visitas/i).should('be.visible');
    // 7 columnas de días (dom–sáb o lun–dom según config)
    cy.get('[data-testid="day-column"], .day-column, [class*="day-col"]')
      .should('have.length', 7);
  });

  it('muestra el botón para agendar una nueva visita', () => {
    cy.contains(/nueva visita|agendar/i).should('be.visible');
  });
});
