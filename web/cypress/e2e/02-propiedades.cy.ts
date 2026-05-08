// Flujo: crear propiedad → ver listado → ver detalle → cambiar estado
describe('Propiedades', () => {
  before(() => {
    cy.loginAs(Cypress.env('adminEmail'), Cypress.env('adminPassword'));
  });

  beforeEach(() => {
    cy.loginAs(Cypress.env('adminEmail'), Cypress.env('adminPassword'));
    cy.visit('/propiedades');
  });

  it('muestra el listado de propiedades', () => {
    cy.contains(/propiedades/i).should('be.visible');
  });

  it('navega al formulario de nueva propiedad', () => {
    cy.contains(/nueva propiedad|agregar/i).click();
    cy.url().should('include', '/propiedades/nueva');
    cy.get('form').should('be.visible');
  });

  it('crea una propiedad y aparece en el listado', () => {
    cy.fixture('propiedad').then((prop) => {
      cy.visit('/propiedades/nueva');
      cy.get('input[name="titulo"], input[placeholder*="título" i]').type(prop.titulo);

      // Seleccionar tipo de propiedad
      cy.get('select[name="tipo"], [data-field="tipo"]').select(prop.tipo);
      cy.get('select[name="tipo_gestion"], [data-field="tipo_gestion"]').select(prop.tipo_gestion);

      // Precio
      cy.get('input[name="precio_venta"], input[placeholder*="precio" i]').first().type(String(prop.precio_venta));

      // Descripción
      cy.get('textarea[name="descripcion"], textarea').first().type(prop.descripcion);

      cy.get('button[type="submit"]').click();
      cy.contains(prop.titulo, { timeout: 10000 }).should('be.visible');
    });
  });

  it('muestra el detalle de una propiedad', () => {
    cy.get('[data-testid="property-card"], .property-card').first().click();
    cy.url().should('match', /\/propiedades\/[a-z0-9-]+$/);
    cy.contains(/disponible|borrador|vendida/i).should('be.visible');
  });
});
