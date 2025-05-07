module.exports = {
    testMatch: ['<rootDir>/harness/types/**/*.test.ts'],
    testPathIgnorePatterns: ['<rootDir>/harness/features/'],
    setupFilesAfterEnv: ['./jest-setup.js'],
    testTimeout: 10000,
    verbose: true,
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {}],
    },
}
