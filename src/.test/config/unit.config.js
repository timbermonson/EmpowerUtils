import { defineConfig } from 'vitest/config'
import { configDefaults } from 'vitest/config'

export default defineConfig({
    test: {
        coverage: {
            reportsDirectory: '.test/coverage',
            clean: true,
        },
        exclude: [...configDefaults.exclude, '.test/*'],
        globals: true,
        globalSetup: '.test/config/globalSetup.js',
        include: ['**/*.test.js', '**/*.test.ts'],
        reporters: ['verbose'],
    },
})
