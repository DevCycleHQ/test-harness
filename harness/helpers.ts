import { Interceptor, Scope } from 'nock'
import { Sdks } from './types'
import nock from 'nock'
import { getServerScope } from './nock'
import { v4 as uuidv4 } from 'uuid'

export const getMockServerUrl = () =>
    `http://${process.env.DOCKER_HOST_IP ?? 'host.docker.internal'}:${global.__MOCK_SERVER_PORT__}`

export const getConnectionStringForProxy = (proxy: string) => {
    const host = global[`__TESTCONTAINERS_${proxy.toUpperCase()}_IP__`]
    const port = global[`__TESTCONTAINERS_${proxy.toUpperCase()}_PORT_3000__`]

    if (!host || !port) {
        throw new Error('Could not find container for proxy: ' + proxy)
    }

    return `http://${host}:${port}`
}

export const mockServerUrl = `http://${process.env.DOCKER_HOST_IP
    ?? 'host.docker.internal'}:${global.__MOCK_SERVER_PORT__}`

export const forEachSDK = (tests) => {
    // get the list of SDK's and their capabilities
    let SDKs
    try {
        SDKs = JSON.parse(process.env.SDKS_TO_TEST ?? '').map((sdk) => Sdks[sdk])
    } catch (e) {
        if (process.env.SDKS_TO_TEST && Sdks[process.env.SDKS_TO_TEST]) {
            SDKs = [Sdks[process.env.SDKS_TO_TEST]]
        } else {
            console.log('No specified SDKs to test, running all tests')
            SDKs = Object.values(Sdks)
        }
    }
    const scope = getServerScope()

    describe.each(SDKs)('%s SDK tests', (name) => {
        afterEach(async () => {
            if (!scope.isDone()) {
                const pendingMocks = scope.pendingMocks()
                throw new Error('Unsatisfied nock scopes: ' + pendingMocks)
            }
            await global.assertNoUnmatchedRequests()
        })
        afterAll(() => {
            // recommended by nock to avoid Jest memory issues
            nock.restore()
        })
        tests(name)
    })
}

export const describeIf = (condition: boolean) => condition ? describe : describe.skip

export const forEachVariableType = (tests) => {
    // get the list of SDK's and their capabilities
    describe.each(Object.keys(variablesForTypes))('Variable %s tests', tests)
}

export const variablesForTypes = {
    string: {
        key: 'var_key',
        value: 'value1',
        type: 'String',
        defaultValue: 'default_value',
        isDefaulted: false
    },
    number: {
        key: 'var_key',
        type: 'Number',
        value: 1,
        defaultValue: 0,
        isDefaulted: false
    },
    boolean: {
        key: 'var_key',
        type: 'Boolean',
        value: true,
        defaultValue: false,
        isDefaulted: false
    },
    JSON: {
        key: 'var_key',
        type: 'JSON',
        value: { 'key': 'value1' },
        defaultValue: {},
        isDefaulted: false
    }
}

export const createClient = async (url: string, clientId?: string, sdkKey?: string | null, options?: object) => {
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
    try {
        return await fetch(`${url}/user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...user
            })
        })
    } catch (e) {
        console.log(e)
        throw e
    }
}

export const callVariable = async (
    clientId: string,
    url: string,
    userLocation: string,
    key?: string,
    defaultValue?: any,
    isAsync?: boolean
) => {
    return await callVariableWithUrl(`${url}/client/${clientId}`, userLocation, isAsync, key, defaultValue,)
}

export const callVariableWithUrl = async (
    url: string,
    userLocation: string,
    isAsync: boolean,
    key?: string,
    defaultValue?: any,
) => {
    return await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            command: 'variable',
            isAsync: isAsync,
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

export const callOnClientInitialized = async (
    clientId: string, url: string
) => {
    return await fetch(`${url}/client/${clientId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            command: 'onClientInitialized',
            isAsync: true,
            params: []
        })
    })
}

export const callAllVariablesCloud = async (clientID: string, url: string, userLocation: string) => {
    try {
        return await callAllVariables(clientID, url, userLocation, true)
    } catch (e) {
        console.log(e)
        throw e
    }

}

export const callAllVariablesLocal = async (clientID: string, url: string, userLocation: string) => {
    try {
        return await callAllVariables(clientID, url, userLocation, false)
    } catch (e) {
        console.log(e)
        throw e
    }
}

const callAllVariables = async (clientID: string, url: string, userLocation: string, isAsync: boolean) => {
    return await fetch(`${url}/client/${clientID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            command: 'allVariables',
            isAsync: isAsync,
            params: [
                { location: userLocation }
            ]
        })
    })
}

export const callTrack = async (clientId: string, url: string, userLocation: string, event: unknown) => {
    return await fetch(`${url}/client/${clientId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            command: 'track',
            params: [
                { location: `${userLocation}` },
                { value: event }
            ],
        })
    })
}

export class TestClient {
    clientId: string
    sdkName: string
    sdkKey: string | null
    clientLocation?: string | null

    constructor(sdkName: string) {
        this.clientId = uuidv4()
        this.sdkName = sdkName
        this.sdkKey = `dvc_server_${this.clientId}`
    }

    private getClientUrl() {
        return (new URL(this.clientLocation ?? '', getConnectionStringForProxy(this.sdkName))).href
    }

    async createClient(options: Record<string, unknown> = {}, sdkKey?: string | null) {
        if (sdkKey !== undefined) {
            this.sdkKey = sdkKey
        }
        const response = await createClient(
            getConnectionStringForProxy(this.sdkName),
            this.clientId,
            this.sdkKey,
            { baseURLOverride: `${getMockServerUrl()}/client/${this.clientId}`, ...options }
        )

        this.clientLocation = response.headers.get('location')
        return response
    }

    async callVariable(
        userLocation: string,
        isAsync: boolean,
        key?: string,
        defaultValue?: any,
    ) {
        try {
            return await callVariableWithUrl(
                this.getClientUrl(),
                userLocation,
                isAsync,
                key,
                defaultValue,
            )
        } catch (e) {
            console.log(e)
            throw e
        }

    }

    async callOnClientInitialized() {
        await fetch(this.getClientUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                command: 'onClientInitialized',
                isAsync: true,
                params: []
            })
        })
    }

    async callAllFeatures(
        userLocation: string,
        isAsync: boolean
    ) {
        return await fetch(this.getClientUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                command: 'allFeatures',
                isAsync: isAsync,
                params: [
                    { location: `${userLocation}` },
                ]
            })
        })
    }

}

export const waitForRequest = async (
    scope: Scope,
    interceptor: Interceptor,
    timeout: number,
    timeoutMessage: string
) => {

    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error(timeoutMessage))
        }, timeout)
    })

    await Promise.race([
        new Promise((resolve) => {
            const callback = (req, inter) => {
                if (inter === interceptor) {
                    scope.off('request', callback)
                    resolve(true)
                }
            }
            scope.on('request', callback)
        }),
        timeoutPromise
    ])
}