// Flujo: un JUNIOR no debe ver los contactos asignados a otro agente del
// mismo tenant (RBAC vía VisibilityGuard en ClientesController).
//
// Este caso estaba deliberadamente ausente hasta ahora: al escribirlo se
// descubrió que GET /api/clientes no aplicaba ninguna restricción por
// agente (ver revisionpruebas.md, Hallazgo #4). Se corrigió agregando
// VisibilityGuard a ClientesController — este test verifica el fix real,
// no solo documenta el comportamiento esperado.
describe('RBAC — visibilidad de contactos por agente', () => {
  const clienteAdminNombre = `Cliente Solo Admin ${Date.now()}`;
  const clienteAnaNombre = `Cliente Solo Ana ${Date.now()}`;

  before(() => {
    // Cliente creado por el ADMIN (queda asignado al admin)
    cy.request('POST', `${Cypress.env('apiUrl')}/api/auth/login`, {
      email: Cypress.env('adminEmail'),
      password: Cypress.env('adminPassword'),
    }).then(({ body: adminLogin }) => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/api/clientes`,
        headers: { Authorization: `Bearer ${adminLogin.accessToken}` },
        body: { nombre: clienteAdminNombre, origen: 'OTRO' },
      });
    });

    // Cliente creado por ANA (JUNIOR) — queda asignado a ella misma
    cy.request('POST', `${Cypress.env('apiUrl')}/api/auth/login`, {
      email: 'ana.junior@gestprop.net',
      password: 'Agent@2026Desa',
    }).then(({ body: anaLogin }) => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/api/clientes`,
        headers: { Authorization: `Bearer ${anaLogin.accessToken}` },
        body: { nombre: clienteAnaNombre, origen: 'OTRO' },
      });
    });
  });

  it('ANA (JUNIOR) ve sus propios contactos pero no los de otros agentes', () => {
    cy.loginAs('ana.junior@gestprop.net', 'Agent@2026Desa');
    cy.visit('/clientes');

    cy.contains('.client-card', clienteAnaNombre, { timeout: 8000 }).should(
      'exist',
    );
    cy.contains('.client-card', clienteAdminNombre).should('not.exist');
  });

  it('ADMIN ve los contactos de todos los agentes del tenant', () => {
    cy.loginAs(Cypress.env('adminEmail'), Cypress.env('adminPassword'));
    cy.visit('/clientes');

    cy.contains('.client-card', clienteAnaNombre, { timeout: 8000 }).should(
      'exist',
    );
    cy.contains('.client-card', clienteAdminNombre).should('exist');
  });
});
