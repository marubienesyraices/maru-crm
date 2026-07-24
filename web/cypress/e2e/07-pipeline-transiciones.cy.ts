// Flujo: crear un trámite vía API y avanzarlo por toda la máquina de estados
// desde la UI (NUEVO → CONTACTADO → INTERESADO → EN_NEGOCIACION → CIERRE →
// GANADO), incluyendo los modales de CIERRE (documentos obligatorios) y
// GANADO (precio/comisión de cierre) que 03-pipeline.cy.ts no cubre.
describe('Pipeline — transición completa de estados', () => {
  let clienteNombre: string;

  beforeEach(() => {
    clienteNombre = `Cliente Pipeline E2E ${Date.now()}`;

    cy.request('POST', `${Cypress.env('apiUrl')}/api/auth/login`, {
      email: Cypress.env('adminEmail'),
      password: Cypress.env('adminPassword'),
    }).then(({ body: loginBody }) => {
      const headers = { Authorization: `Bearer ${loginBody.accessToken}` };

      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/api/clientes`,
        headers,
        body: { nombre: clienteNombre, origen: 'OTRO' },
      }).then(({ body: cliente }) => {
        cy.fixture('propiedad').then((prop) => {
          cy.request({
            method: 'POST',
            url: `${Cypress.env('apiUrl')}/api/propiedades`,
            headers,
            body: {
              titulo: `${prop.titulo} Pipeline ${Date.now()}`,
              tipo: prop.tipo,
              gestion: 'VENTA',
              precioVenta: 500000,
              descripcion: prop.descripcion,
              departamento: prop.departamento,
              municipio: prop.municipio,
              zona: prop.zona,
              direccion: prop.direccion,
            },
          }).then(({ body: propiedad }) => {
            // Las propiedades nacen en BORRADOR — pasar a EN_NEGOCIACION
            // exige DISPONIBLE (ver pipeline.service.ts), así que hay que
            // publicarla antes de crear el trámite.
            cy.request({
              method: 'PATCH',
              url: `${Cypress.env('apiUrl')}/api/propiedades/${propiedad.id}/estado`,
              headers,
              body: { nuevoEstado: 'DISPONIBLE' },
            }).then(() => {
              cy.request({
                method: 'POST',
                url: `${Cypress.env('apiUrl')}/api/pipeline`,
                headers,
                body: { clienteId: cliente.id, propiedadId: propiedad.id },
              });
            });
          });
        });
      });
    });

    cy.loginAs(Cypress.env('adminEmail'), Cypress.env('adminPassword'));
    cy.visit('/pipeline');
  });

  it('avanza un trámite de NUEVO a GANADO pasando por los modales de CIERRE y GANADO', () => {
    cy.contains('.pipeline-card', clienteNombre, { timeout: 8000 }).should(
      'exist',
    );

    const advance = (label: RegExp) => {
      cy.contains('.pipeline-card', clienteNombre)
        .find('button')
        .contains(label)
        .click();
    };

    advance(/^→ Contactado$/);
    cy.contains('.pipeline-column', 'Contactado').within(() => {
      cy.contains(clienteNombre, { timeout: 8000 }).should('exist');
    });

    advance(/^→ Interesado$/);
    cy.contains('.pipeline-column', 'Interesado').within(() => {
      cy.contains(clienteNombre, { timeout: 8000 }).should('exist');
    });

    advance(/^→ Negociar$/);
    cy.contains('.pipeline-column', 'En Negociación').within(() => {
      cy.contains(clienteNombre, { timeout: 8000 }).should('exist');
    });

    // ─── Modal CIERRE: exige al menos un documento de soporte ───
    advance(/^→ Cierre$/);
    cy.contains('Documentos de cierre requeridos').should('be.visible');
    cy.contains('.modal-footer button', 'Pasar a Cierre').should(
      'be.disabled',
    );
    cy.get('textarea').type('Promesa de compraventa firmada');
    cy.contains('.modal-footer button', 'Pasar a Cierre').should(
      'not.be.disabled',
    );
    cy.contains('.modal-footer button', 'Pasar a Cierre').click();
    cy.contains('.pipeline-column', 'Cierre').within(() => {
      cy.contains(clienteNombre, { timeout: 8000 }).should('exist');
    });

    // ─── Modal GANADO: precio precargado desde la propiedad (VENTA) ───
    advance(/^→ Ganado$/);
    cy.contains('Confirmar cierre del trámite').should('be.visible');
    cy.contains('.modal-footer button', 'Confirmar cierre').should(
      'not.be.disabled',
    );
    cy.contains('.modal-footer button', 'Confirmar cierre').click();
    cy.contains('.pipeline-column', 'Ganado').within(() => {
      cy.contains(clienteNombre, { timeout: 8000 }).should('exist');
    });
  });
});
