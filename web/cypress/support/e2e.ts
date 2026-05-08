import '@testing-library/cypress/add-commands';

// Comando custom: login sin 2FA (usuario de testing sin TOTP activo)
Cypress.Commands.add('loginAs', (email: string, password: string) => {
  cy.request('POST', `${Cypress.env('apiUrl')}/api/auth/login`, { email, password })
    .then(({ body }) => {
      window.localStorage.setItem('accessToken', body.accessToken);
      window.localStorage.setItem('refreshToken', body.refreshToken);
    });
});

// Comando custom: limpiar sesión
Cypress.Commands.add('logout', () => {
  window.localStorage.removeItem('accessToken');
  window.localStorage.removeItem('refreshToken');
});

declare global {
  namespace Cypress {
    interface Chainable {
      loginAs(email: string, password: string): Chainable<void>;
      logout(): Chainable<void>;
    }
  }
}
