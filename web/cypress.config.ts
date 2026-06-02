import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 8000,
    viewportWidth: 1280,
    viewportHeight: 800,

    env: {
      apiUrl: 'http://localhost:3000',
      // Credenciales del usuario de prueba (seed)
      adminEmail: 'admin@gestprop.net',
      adminPassword: 'Admin@2026',
    },
  },
});
