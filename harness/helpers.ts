import { Interceptor, Scope } from 'nock'
import { SDKCapabilities, Sdks } from './types'
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

export const getMockServerUrl = () => {
    if (process.env.LOCAL_MODE === "1") {
        return `http://localhost:${global.__MOCK_SERVER_PORT__}`
    }

    return `http://${process.env.DOCKER_HOST_IP ?? 'host.docker.internal'}:${global.__MOCK_SERVER_PORT__}`
}


export const getConnectionStringForProxy = (proxy: string) => {
    if (process.env.LOCAL_MODE === "1") {
        return `http://localhost:3000`
    }

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
        tests(name)
    })
}

export const describeIf = (condition: boolean) => condition ? describe : describe.skip

export const describeCapability = (sdkName: string, capability: string) => {
    return describeIf(SDKCapabilities[sdkName].includes(capability))
}

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
    waitForInitialization: boolean,
    clientId: string,
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
            waitForInitialization,
            options
        })
    })
}

type CommandBody = {
    command: string,
    isAsync?: boolean,
    params: ({ value: unknown } | { type: 'user' | 'event' })[],
    user?: Record<string, unknown>,
    event?: Record<string, unknown>
}

export const sendCommand = async (url: string, body: CommandBody) => {
    return await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            command: body.command,
            isAsync: body.isAsync,
            params: body.params,
            user: body.user,
            event: body.event
        })
    })
}

const callVariable = async (
    url: string,
    user: Record<string, unknown>,
    isAsync: boolean,
    key?: string,
    defaultValue?: any,
) => {
    return await sendCommand(url, {
        command: 'variable',
        user,
        params: [
            { type: 'user' },
            { value: key },
            { value: defaultValue }
        ],
        isAsync
    })
}

export const wait = (ms: number) => {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve()
        }, ms)
    })
}

const callAllVariables = async (url: string, user: Record<string, unknown>, isAsync: boolean) => {
    return await sendCommand(url, {
        command: 'allVariables',
        user,
        params: [{ type: 'user' }],
        isAsync
    })
}

const callTrack = async (url: string, user: Record<string, unknown>, event: Record<string, unknown>, isAsync: boolean) => {
    return await sendCommand(url, {
        command: 'track',
        user,
        event,
        params: [{ type: 'user' }, { type: 'event' }],
        isAsync
    })
}

const callAllFeatures = async (url: string, user: Record<string, unknown>, isAsync: boolean) => {
    return await sendCommand(url, {
        command: 'allFeatures',
        user,
        params: [{ type: 'user' }],
        isAsync
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
        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}, ${await response.text()}`)
        }
        const result = await response.clone().json()
        expect(result.exception).toBeUndefined()
        expect(result.asyncError).toBeUndefined()
    } else {
        const result = await response.clone().json()
        // We are expecting this operation to fail, so throw if it succeeds
        expect(result.exception || result.asyncError).toBeDefined()
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
}

export class LocalTestClient extends BaseTestClient {
    async createClient(
        waitForInitialization: boolean,
        options: Record<string, unknown> = {},
        sdkKey?: string | null,
        shouldFail = false
    ) {
        if (sdkKey !== undefined) {
            this.sdkKey = sdkKey
        }
        const response = await createClient(
            getConnectionStringForProxy(this.sdkName),
            false,
            waitForInitialization,
            this.clientId,
            this.sdkKey,
            {
                eventsAPIURI: `${getMockServerUrl()}/client/${this.clientId}`,
                configCDNURI: `${getMockServerUrl()}/client/${this.clientId}`,
                bucketingAPIURI: `${getMockServerUrl()}/client/${this.clientId}`,
                ...options
            }
        )

        await checkFailed(response, shouldFail)

        this.clientLocation = response.headers.get('location')
        return response
    }

    async callVariable(
        user: Record<string, unknown>,
        key?: string,
        defaultValue?: any,
        shouldFail = false
    ) {
        const result = await callVariable(
            this.getClientUrl(),
            user,
            false,
            key,
            defaultValue,
        )

        await checkFailed(result, shouldFail)
        return result
    }

    async callAllVariables(
        user: Record<string, unknown>,
        shouldFail = false
    ) {
        const result = await callAllVariables(this.getClientUrl(), user, false)

        await checkFailed(result, shouldFail)
        return result
    }

    async close() {
        const result = await sendCommand(this.getClientUrl(), {
            command: 'close', params: [], isAsync: true
        })
        await checkFailed(result, false)
    }

    async callAllFeatures(
        user: Record<string, unknown>,
        shouldFail = false
    ) {
        const result = await callAllFeatures(this.getClientUrl(), user, false)
        await checkFailed(result, shouldFail)
        return result
    }

    async callTrack(user: Record<string, unknown>, event: Record<string, unknown>, shouldFail = false) {
        const result = await callTrack(this.getClientUrl(), user, event, false)

        await checkFailed(result, shouldFail)

        return result
    }

    async callSetClientCustomData(data: Record<string, unknown>, shouldFail = false) {
        const result = await sendCommand(this.getClientUrl(), {
            command: 'setClientCustomData',
            params: [{ value: data }],
            isAsync: false
        })

        await checkFailed(result, shouldFail)

        return result
    }
}

export class CloudTestClient extends BaseTestClient {
    async createClient(options: Record<string, unknown> = {}, sdkKey?: string | null, shouldFail = false) {
        if (sdkKey !== undefined) {
            this.sdkKey = sdkKey
        }
        const response = await createClient(
            getConnectionStringForProxy(this.sdkName),
            true,
            false,
            this.clientId,
            this.sdkKey,
            {
                eventsAPIURI: `${getMockServerUrl()}/client/${this.clientId}`,
                configCDNURI: `${getMockServerUrl()}/client/${this.clientId}`,
                bucketingAPIURI: `${getMockServerUrl()}/client/${this.clientId}`,
                ...options
            }
        )

        await checkFailed(response, shouldFail)

        this.clientLocation = response.headers.get('location')
        return response
    }

    async callVariable(
        user: Record<string, unknown>,
        key?: string,
        defaultValue?: any,
        shouldFail = false
    ) {
        const result = await callVariable(
            this.getClientUrl(),
            user,
            true,
            key,
            defaultValue,
        )
        await checkFailed(result, shouldFail)
        return result
    }

    async callAllVariables(
        user: Record<string, unknown>,
        shouldFail = false
    ) {
        const result = await callAllVariables(this.getClientUrl(), user, true)
        await checkFailed(result, shouldFail)
        return result
    }

    async callAllFeatures(
        user: Record<string, unknown>,
        shouldFail = false
    ) {
        const result = await callAllFeatures(this.getClientUrl(), user, true)
        await checkFailed(result, shouldFail)
        return result
    }

    async callTrack(user: Record<string, unknown>, event: Record<string, unknown>, shouldFail = false) {
        const result = await callTrack(this.getClientUrl(), user, event, true)

        await checkFailed(result, shouldFail)

        return result
    }
}

export const expectErrorMessageToBe = (message: string, expected: string) => {
    // when we consolidate error messages to be uniform, change this to actually compare
    // the exception and the expected exception message
    if (message !== expected) {
        console.warn(`Expected error message to be: \n ${expected}, but got: \n ${message}`)
    }
    expect(message).toBeTruthy()
}

export const getPlatformBySdkName = (name: string, isLocal: boolean) => {
    return name === 'DotNet' ? // TODO use Sdks.dotnet instead of 'DotNet' when enable dotnet
        `C# ${isLocal ? 'Local' : 'Cloud'}`
        : name
}
