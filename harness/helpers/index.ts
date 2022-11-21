export const forEachSDK = (name, tests) => {
    // get the list of SDK's and their capabilities
    const SDKs = JSON.parse(process.env.SDKS_TO_TEST) || []
    describe.each(SDKs)(name, tests)
}
