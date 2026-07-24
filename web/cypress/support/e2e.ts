import '@testing-library/cypress/add-commands';

// Comando custom: login directo via API (sin UI)
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
  // eslint-disable-next-line @typescript-eslint/no-namespace -- required by Cypress's own TS augmentation pattern
  namespace Cypress {
    interface Chainable {
      loginAs(email: string, password: string): Chainable<void>;
      logout(): Chainable<void>;
    }
  }
}
