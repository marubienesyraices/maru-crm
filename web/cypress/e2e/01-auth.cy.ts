// Flujo de autenticación: login, redirect, persistencia de sesión
describe('Autenticación', () => {
  beforeEach(() => cy.visit('/login'));

  it('muestra el formulario de login', () => {
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
  });

  it('rechaza credenciales incorrectas', () => {
    cy.get('input[type="email"]').type('malo@test.com');
    cy.get('input[type="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
    cy.contains(/credencial|incorrecto|inválido/i, { timeout: 6000 }).should('be.visible');
  });

  it('login exitoso redirige al dashboard', () => {
    cy.loginAs(Cypress.env('adminEmail'), Cypress.env('adminPassword'));
    cy.visit('/dashboard');
    cy.url().should('include', '/dashboard');
    cy.contains(/bienvenid|dashboard|propiedades/i, { timeout: 8000 }).should('be.visible');
  });

  it('ruta protegida redirige a login si no hay sesión', () => {
    cy.logout();
    cy.visit('/dashboard');
    cy.url().should('include', '/login');
  });

  it('persiste la sesión al recargar', () => {
    cy.loginAs(Cypress.env('adminEmail'), Cypress.env('adminPassword'));
    cy.visit('/dashboard');
    cy.reload();
    cy.url().should('include', '/dashboard');
  });
});
