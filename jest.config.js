const commonConfig = {
    preset: '@trendyol/jest-testcontainers',
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {}]
    },
    testEnvironment: './jest-environment.ts',
}
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    testTimeout: 60000,
    projects: [
        {
            ...commonConfig,
            displayName: 'NodeJS',
            globals: {
                JEST_PROJECT_SDK_TO_TEST: 'nodejs'
            }
        },
        {
            ...commonConfig,
            displayName: 'DotNet',
            globals: {
                JEST_PROJECT_SDK_TO_TEST: 'dotnet'
            }
        },
    ]
};
