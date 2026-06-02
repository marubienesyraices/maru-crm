// Flujo: crear propiedad → ver listado → ver detalle → cambiar estado
describe('Propiedades', () => {
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

  it('crea una propiedad vía API y aparece en el listado', () => {
    cy.fixture('propiedad').then((prop) => {
      // Login to get fresh token scoped to this test's cy.request chain
      cy.request('POST', `${Cypress.env('apiUrl')}/api/auth/login`, {
        email: Cypress.env('adminEmail'),
        password: Cypress.env('adminPassword'),
      }).then(({ body }) => {
        const token = body.accessToken;
        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/api/propiedades`,
          headers: { Authorization: `Bearer ${token}` },
          body: {
            titulo: prop.titulo,
            tipo: prop.tipo,
            gestion: prop.tipo_gestion,
            precioVenta: prop.precio_venta,
            descripcion: prop.descripcion,
            departamento: prop.departamento,
            municipio: prop.municipio,
            zona: prop.zona,
            direccion: prop.direccion,
          },
        }).then(({ status }) => {
          expect(status).to.be.oneOf([200, 201]);
        });
      });
      cy.reload();
      cy.contains(prop.titulo, { timeout: 8000 }).should('be.visible');
    });
  });

  it('muestra el detalle de una propiedad', () => {
    cy.get('body').then(($body) => {
      if ($body.find('.prop-card').length > 0) {
        cy.get('.prop-card').first().click();
        cy.url().should('match', /\/propiedades\/[a-z0-9-]+$/);
        cy.contains(/disponible|borrador|vendida/i).should('be.visible');
      } else {
        cy.log('No properties in DB — skipping detail test');
      }
    });
  });
});
