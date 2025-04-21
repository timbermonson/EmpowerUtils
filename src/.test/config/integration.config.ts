import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        coverage: {
            reportsDirectory: '.test/coverage',
            clean: true,
        },
        globals: true,
        globalSetup: '.test/config/globalSetup.js',
        include: ['.test/integration/**/*.test.js'],
        reporters: ['verbose'],
    },
})
