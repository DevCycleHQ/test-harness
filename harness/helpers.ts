import { Interceptor, Scope } from 'nock'
import { Sdks } from './types'
import nock from 'nock'
import { getServerScope, resetServerScope } from './nock'
import { v4 as uuidv4 } from 'uuid'

const oldFetch = fetch

global.fetch = async (...args) => {
    try {
        return await oldFetch(...args)
    } catch (e) {
        console.error(e)
        throw e
    }
}

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
                resetServerScope()
                throw new Error('Unsatisfied nock scopes: ' + pendingMocks)
            }
            resetServerScope()
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

const createClient = async (
    url: string,
    enableCloudBucketing: boolean,
    clientId?: string,
    sdkKey?: string | null,
    options?: object
) => {
    return await fetch(`${url}/client`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            clientId,
            sdkKey,
            enableCloudBucketing,
            options
        })
    })
}

export const createUser = async (url: string, user: object, shouldFail = false) => {
    const result = await fetch(`${url}/user`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ...user
        })
    })

    await checkFailed(result, shouldFail)

    return result
}

const callVariable = async (
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

const callAllVariables = async (url: string, userLocation: string, isAsync: boolean) => {
    return await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            command: 'allVariables',
            isAsync,
            params: [{ location: userLocation }]
        })
    })
}

const callTrack = async (url: string, userLocation: string, event: unknown) => {
    return await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            command: 'track',
            params: [
                { location: `${userLocation}` },
                { value: event }
            ]
        })
    })
}

const callAllFeatures = async (url: string, userLocation: string, isAsync: boolean) => {
    return await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            command: 'allFeatures',
            isAsync,
            params: [
                { location: `${userLocation}` }
            ],
        })
    })
}

export const waitForRequest = async (
    scope: Scope,
    interceptor: Interceptor,
    timeout: number,
    timeoutMessage: string
) => {
    if (scope.isDone()){
        return
    }

    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error(timeoutMessage))
        }, timeout)
    })

    let callback

    await Promise.race([
        new Promise((resolve) => {
            callback = (req, inter) => {
                if (inter === interceptor) {
                    resolve(true)
                }
            }
            scope.on('request', callback)
        }),
        timeoutPromise
    ]).finally(() => {
        scope.off('request', callback)
    })
}

const checkFailed = async (response: Response, shouldFail: boolean) => {
    if (!shouldFail) {
        const result = await response.clone().json()
        expect(result.exception).toBeUndefined()
        expect(result.asyncError).toBeUndefined()
    }
}

class BaseTestClient {
    clientId: string
    sdkName: string
    sdkKey: string | null
    clientLocation?: string | null

    constructor(sdkName: string) {
        this.clientId = uuidv4()
        this.sdkName = sdkName
        this.sdkKey = `dvc_server_${this.clientId}`
    }

    protected getClientUrl() {
        return (new URL(this.clientLocation ?? '', getConnectionStringForProxy(this.sdkName))).href
    }

    async callTrack(userLocation: string, event: unknown, shouldFail: boolean = false) {
        const result = await callTrack(this.getClientUrl(), userLocation, event)

        await checkFailed(result, shouldFail)

        return result
    }
}

export class LocalTestClient extends BaseTestClient {
    async createClient(options: Record<string, unknown> = {}, sdkKey?: string | null, shouldFail: boolean = false) {
        if (sdkKey !== undefined) {
            this.sdkKey = sdkKey
        }
        const response = await createClient(
            getConnectionStringForProxy(this.sdkName),
            false,
            this.clientId,
            this.sdkKey,
            {
                eventsAPIBaseURL: `${getMockServerUrl()}/client/${this.clientId}`,
                configCDNBaseURL: `${getMockServerUrl()}/client/${this.clientId}`,
                bucketingAPIBaseURL: `${getMockServerUrl()}/client/${this.clientId}`,
                ...options
            }
        )

        await checkFailed(response, shouldFail)

        this.clientLocation = response.headers.get('location')
        return response
    }

    async callVariable(
        userLocation: string,
        key?: string,
        defaultValue?: any,
        shouldFail: boolean = false
    ) {
        const result = await callVariable(
            this.getClientUrl(),
            userLocation,
            false,
            key,
            defaultValue,
        )

        await checkFailed(result, shouldFail)
        return result
    }

    async callAllVariables(
        userLocation: string,
        shouldFail: boolean = false
    ) {
        const result = await callAllVariables(this.getClientUrl(), userLocation, false)

        await checkFailed(result, shouldFail)
        return result
    }

    async callOnClientInitialized() {
        const response = await fetch(this.getClientUrl(), {
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

        await checkFailed(response, false)
    }

    async close() {
        const result = await fetch(this.getClientUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                command: 'close',
                isAsync: true,
                params: []
            })
        })
        await checkFailed(result, false)
    }

    async callAllFeatures(
        userLocation: string,
        shouldFail: boolean = false
    ) {
        const result = await callAllFeatures(this.getClientUrl(), userLocation, false)
        await checkFailed(result, shouldFail)
        return result
    }
}

export class CloudTestClient extends BaseTestClient {
    async createClient(options: Record<string, unknown> = {}, sdkKey?: string | null, shouldFail: boolean = false) {
        if (sdkKey !== undefined) {
            this.sdkKey = sdkKey
        }
        const response = await createClient(
            getConnectionStringForProxy(this.sdkName),
            true,
            this.clientId,

            this.sdkKey,
            {
                eventsAPIBaseURL: `${getMockServerUrl()}/client/${this.clientId}`,
                configCDNBaseURL: `${getMockServerUrl()}/client/${this.clientId}`,
                bucketingAPIBaseURL: `${getMockServerUrl()}/client/${this.clientId}`,
                ...options
            }
        )

        await checkFailed(response, shouldFail)

        this.clientLocation = response.headers.get('location')
        return response
    }

    async callVariable(
        userLocation: string,
        key?: string,
        defaultValue?: any,
        shouldFail: boolean = false
    ) {
        const result = await callVariable(
            this.getClientUrl(),
            userLocation,
            true,
            key,
            defaultValue,
        )
        await checkFailed(result, shouldFail)
        return result
    }

    async callAllVariables(
        userLocation: string,
        shouldFail: boolean = false
    ) {
        const result = await callAllVariables(this.getClientUrl(), userLocation, true)
        await checkFailed(result, shouldFail)
        return result
    }

    async callAllFeatures(
        userLocation: string,
        shouldFail: boolean = false
    ) {
        const result = await callAllFeatures(this.getClientUrl(), userLocation, true)
        await checkFailed(result, shouldFail)
        return result
    }
}
