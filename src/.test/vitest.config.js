import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        reporters: ['verbose'],
        coverage: {
            clean: true,
        },
        globals: true,
        include: ['**/*.test.js'],
    },
})
