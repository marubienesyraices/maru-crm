// Flujo: ver agenda, navegación semanal
describe('Agenda', () => {
  beforeEach(() => {
    cy.loginAs(Cypress.env('adminEmail'), Cypress.env('adminPassword'));
    cy.visit('/agenda');
  });

  it('muestra la vista semanal con 7 columnas de días', () => {
    cy.contains(/agenda|visitas/i).should('be.visible');
    // agenda-grid contains 7 .agenda-day divs (the outer column wrapper, not sub-elements)
    cy.get('.agenda-grid > .agenda-day, .agenda-grid > [class*="agenda-day"]')
      .should('have.length', 7);
  });

  it('muestra el botón para agendar una nueva visita', () => {
    cy.contains(/nueva visita|agendar/i).should('be.visible');
  });
});
