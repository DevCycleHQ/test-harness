export const Sdks = {
    nodejs: 'NodeJS',
    'of-nodejs': 'OF-NodeJS',
    dotnet: 'DotNet',
    'of-dotnet': 'OF-DotNet',
    go: 'Go',
    ruby: 'Ruby',
    php: 'PHP',
    java: 'Java',
    python: 'Python',
}

// Extract the list of SDKs to test from the environment variable SDKS_TO_TEST
// It can be formatted as a JSON array or a comma-separated list.
// The SDKs are returned as their human-readable names from the Sdks enum, not the enum keys.
export const getSDKs = () => {
    const SDKS_TO_TEST = process.env.SDKS_TO_TEST

    try {
        return JSON.parse(SDKS_TO_TEST ?? '').map((sdk) => Sdks[sdk])
    } catch (e) {
        if (SDKS_TO_TEST && Sdks[SDKS_TO_TEST]) {
            return [Sdks[SDKS_TO_TEST]]
        } else if (SDKS_TO_TEST) {
            return SDKS_TO_TEST.split(',')
                .map((sdk) => Sdks[sdk])
                .filter((sdkName) => sdkName !== undefined)
        } else {
            console.warn('No specified SDKs to test, running all tests')
            return Object.values(Sdks)
        }
    }
}
