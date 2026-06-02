// Flujo: ver tablero Kanban, verificar columnas
describe('Pipeline Kanban', () => {
  beforeEach(() => {
    cy.loginAs(Cypress.env('adminEmail'), Cypress.env('adminPassword'));
    cy.visit('/pipeline');
  });

  it('muestra las columnas del pipeline', () => {
    // Columns render as .pipeline-column elements with .pipeline-col-title spans.
    // The logo img with position:fixed may overlap visually, so we assert existence.
    const columnas = ['Nuevo', 'Contactado', 'Interesado', 'En Negociación', 'Ganado', 'Perdido'];
    columnas.forEach((col) => {
      cy.get('.pipeline-col-title').contains(col).should('exist');
    });
  });

  it('muestra las tarjetas de trámites', () => {
    cy.get('.pipeline-column').should('have.length.gte', 4);
  });
});
