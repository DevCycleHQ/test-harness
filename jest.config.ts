/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: '@trendyol/jest-testcontainers',
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {}]
    },
    globalSetup: './jest-global.ts',
    testEnvironment: './jest-environment.ts',
    setupFilesAfterEnv: ['./jest-setup.js'],
    testTimeout: 60000,
}
