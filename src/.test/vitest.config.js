import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        globalSetup: '.test/globalSetup.js',
        reporters: ['verbose'],
        coverage: {
            clean: true,
        },
        globals: true,
        include: ['**/*.test.js'],
    },
})
