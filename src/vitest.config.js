import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        coverage: {
            clean: true,
        },
        globals: true,
        include: ['**/*.test.js'],
    },
})
