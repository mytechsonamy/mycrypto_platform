import { defineConfig } from "cypress";

export default defineConfig({
    e2e: {
        setupNodeEvents(on, config) {
            // implement node event listeners here
        },
        baseUrl: 'http://localhost:3003',
        supportFile: false,
        specPattern: 'cypress/e2e/**/*.{js,jsx,ts,tsx,spec.ts}',
    },
});

