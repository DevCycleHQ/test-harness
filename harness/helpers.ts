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
        console.log('No specified SDKs to test, running all tests')
        SDKs = Object.values(Sdks)
    }
    describe.each(SDKs)('%s SDK tests', tests)
}
export const forEachVariableType = (tests) => {
    // get the list of SDK's and their capabilities
    describe.each(Object.keys(variablesForTypes))('Variable %s tests', tests)
}

export const variablesForTypes = {
    string: {
        key: 'var_key',
        value: 'value1',
        defaultValue: 'default_value',
        isDefaulted: false
    },
    number: {
        key: 'var_key',
        value: 1,
        defaultValue: 0,
        isDefaulted: false
    },
    boolean: {
        key: 'var_key',
        value: true,
        defaultValue: false,
        isDefaulted: false
    },
    JSON: {
        key: 'var_key',
        value: { 'key': 'value1' },
        defaultValue: {},
        isDefaulted: false
    }
}

export const createClient = async (url: string, clientId?: string, sdkKey?: string, options?: object) => {
    return await fetch(`${url}/client`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            clientId,
            sdkKey,
            options
        })
    })
}

export const createUser = async (url: string, user: object) => {
    return await fetch(`${url}/user`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ...user
        })
    })
}

export const callVariable = async (
    clientId: string, 
    url: string, 
    userLocation: string, 
    key?: string, 
    defaultValue?: any
) => {
    return await fetch(`${url}/client/${clientId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            command: 'variable',
            params: [
                { location: `${userLocation}` },
                { value: key },
                { value: defaultValue }
            ]
        })
    })
}

export const wait = (ms: number) => {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve()
        }, ms)
    })
}

export const describeIf = (condition: boolean) => condition ? describe : describe.skip
