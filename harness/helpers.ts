import { Sdks } from './types'
export const getConnectionStringForProxy = (proxy: string) => {
    const host = global[`__TESTCONTAINERS_${proxy.toUpperCase()}_IP__`]
    const port = global[`__TESTCONTAINERS_${proxy.toUpperCase()}_PORT_3000__`]

    if (!host || !port) {
        throw new Error('Could not find container for proxy: ' + proxy)
    }

    return `http://${host}:${port}`
}

export const forEachSDK = (tests) => {
    // get the list of SDK's and their capabilities
    let SDKs
    try {
        SDKs = JSON.parse(process.env.SDKS_TO_TEST)
    } catch (e) {
        console.warn('Unable to parse SDKS to test env var')
        SDKs = Object.values(Sdks)
    }
    describe.each(SDKs)('%s SDK tests', tests)
}

export const describeIf = (condition: boolean) => condition ? describe : describe.skip
