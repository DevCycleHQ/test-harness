import { Interceptor, Scope } from 'nock'
import { SDKCapabilities, Sdks } from '../types'
import { getServerScope, resetServerScope } from '../nock'
import { v4 as uuidv4 } from 'uuid'

const oldFetch = fetch

Object.defineProperty(global, 'fetch', { writable: true })
global.fetch = async (url, ...args) => {
    try {
        return await oldFetch(url, ...args)
    } catch (e) {
        console.error('Error fetching url: ' + url, e)
        throw e
    }
}

export const getMockServerUrl = () => {
    if (process.env.LOCAL_MODE === '1') {
        return `http://localhost:${global.__MOCK_SERVER_PORT__}`
    }

    return `http://${process.env.DOCKER_HOST_IP ?? 'host.docker.internal'}:${global.__MOCK_SERVER_PORT__}`
}

export const getConnectionStringForProxy = (proxy: string) => {
    if (process.env.LOCAL_MODE === '1') {
        return `http://${global.LOCAL_HOST_BINDING || '0.0.0.0'}:3000`
    }

    const host = global[`__TESTCONTAINERS_${proxy.toUpperCase()}_IP__`]
    const port = global[`__TESTCONTAINERS_${proxy.toUpperCase()}_PORT_3000__`]

    if (!host || !port) {
        throw new Error('Could not find container for proxy: ' + proxy)
    }

    return `http://${host}:${port}`
}

let currentClient: BaseTestClient
const clientTestNameMap: Record<string, string> = {}

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

export const getSDKName = () => global.JEST_PROJECT_SDK_TO_TEST

/**
 * This is used within the jest tests to fetch the running SDK environment for the current jest project.
 * See `jest.config.ts` for more details on all projects. We also use this function to get the current nock server scope
 * and add an `afterEach()` method to cleanup the client.
 */
export const getSDKScope = (): { sdkName: string; scope: Scope } => {
    const sdkName = global.JEST_PROJECT_SDK_TO_TEST
    if (!sdkName) {
        throw new Error(
            'No SDK specified to test using global.JEST_PROJECT_SDK_TO_TEST in jest.config.ts',
        )
    }
    const scope = getServerScope()

    afterEach(async () => {
        await cleanupCurrentClient(scope)
    })
    return { sdkName, scope }
}

export const cleanupCurrentClient = async (scope) => {
    if (currentClient) {
        await currentClient.close()
    }

    if (!scope.isDone()) {
        const pendingMocks = scope.pendingMocks()
        resetServerScope()
        throw new Error(
            'Requests were expected but not received: ' + pendingMocks,
        )
    }

    resetServerScope()
    if (currentClient) {
        await global.assertNoUnmatchedRequests(
            currentClient.clientId,
            clientTestNameMap,
        )
        currentClient = null
    }
}

export const describeIf = (condition: boolean) =>
    condition ? describe : describe.skip

export const describeCapability = (
    sdkName: string,
    ...capabilities: string[]
) => {
    return describeIf(
        capabilities.every((capability) =>
            SDKCapabilities[sdkName].includes(capability),
        ),
    )
}

export const hasCapability = (sdkName: string, capability: string) => {
    return SDKCapabilities[sdkName].includes(capability)
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
        isDefaulted: false,
    },
    number: {
        key: 'var_key',
        type: 'Number',
        value: 1,
        defaultValue: 0,
        isDefaulted: false,
    },
    boolean: {
        key: 'var_key',
        type: 'Boolean',
        value: true,
        defaultValue: false,
        isDefaulted: false,
    },
    JSON: {
        key: 'var_key',
        type: 'JSON',
        value: { key: 'value1' },
        defaultValue: {},
        isDefaulted: false,
    },
}

const createClient = async (
    url: string,
    enableCloudBucketing: boolean,
    waitForInitialization: boolean,
    clientId: string,
    sdkKey?: string | null,
    options?: object,
) => {
    return await fetch(`${url}/client`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            clientId,
            sdkKey,
            enableCloudBucketing,
            waitForInitialization,
            options,
        }),
    })
}

type CommandBody = {
    command: string
    isAsync?: boolean
    params: ({ value: unknown } | { type: 'user' | 'event' })[]
    user?: Record<string, unknown>
    event?: Record<string, unknown>
}

export const sendCommand = async (url: string, body: CommandBody) => {
    return await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            command: body.command,
            isAsync: body.isAsync,
            params: body.params,
            user: body.user,
            event: body.event,
        }),
    })
}

const callVariableValue = async (
    url: string,
    user: Record<string, unknown>,
    sdkName: string,
    isAsync: boolean,
    key?: string,
    variableType?: string,
    defaultValue?: any,
) => {
    return await performCallVariable(
        url,
        user,
        sdkName,
        isAsync,
        key,
        variableType,
        defaultValue,
        'variableValue',
    )
}

const callVariable = async (
    url: string,
    user: Record<string, unknown>,
    sdkName: string,
    isAsync: boolean,
    key?: string,
    variableType?: string,
    defaultValue?: any,
) => {
    return await performCallVariable(
        url,
        user,
        sdkName,
        isAsync,
        key,
        variableType,
        defaultValue,
        'variable',
    )
}

const performCallVariable = async (
    url: string,
    user: Record<string, unknown>,
    sdkName: string,
    isAsync: boolean,
    key?: string,
    variableType?: string,
    defaultValue?: any,
    command = 'variable',
) => {
    const params: CommandBody['params'] = [
        { type: 'user' },
        { value: key },
        { value: defaultValue },
    ]
    // Need to pass in the variable type into the OpenFeature provider as it doesn't have a generic variable interface
    if (sdkName === 'OF-NodeJS') {
        params.push({ value: variableType })
    }
    return await sendCommand(url, {
        command,
        user,
        params,
        isAsync,
    })
}

export const wait = (ms: number) => {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve()
        }, ms)
    })
}

const callAllVariables = async (
    url: string,
    user: Record<string, unknown>,
    isAsync: boolean,
) => {
    return await sendCommand(url, {
        command: 'allVariables',
        user,
        params: [{ type: 'user' }],
        isAsync,
    })
}

const callTrack = async (
    url: string,
    user: Record<string, unknown>,
    event: Record<string, unknown>,
    isAsync: boolean,
) => {
    return await sendCommand(url, {
        command: 'track',
        user,
        event,
        params: [{ type: 'user' }, { type: 'event' }],
        isAsync,
    })
}

const callAllFeatures = async (
    url: string,
    user: Record<string, unknown>,
    isAsync: boolean,
) => {
    return await sendCommand(url, {
        command: 'allFeatures',
        user,
        params: [{ type: 'user' }],
        isAsync,
    })
}

export const waitForRequest = async (
    scope: Scope,
    interceptor: Interceptor,
    timeout: number,
    timeoutMessage: string,
) => {
    if (scope.isDone()) {
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
                    if (!(interceptor as any).counter) {
                        resolve(true)
                    }
                }
            }
            scope.on('request', callback)
        }),
        timeoutPromise,
    ]).finally(() => {
        scope.off('request', callback)
    })
}

const checkFailed = async (response: Response, shouldFail: boolean) => {
    if (!shouldFail) {
        if (!response.ok) {
            throw new Error(
                `Request to ${response.url} failed with status ${response.status}, ${await response.text()}`,
            )
        }
        const result = await response.clone().json()
        if (result.exception) {
            console.error(`Exception from proxy: ${result.exception}`)
        }
        if (result.asyncError) {
            console.error(`AsyncError from proxy: ${result.asyncError}`)
        }
        if (result.stack) {
            console.error('Stack trace from proxy:', result.stack)
        }
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
        currentClient = this
        const currentTestName = expect.getState().currentTestName
        if (!currentTestName) {
            throw new Error(
                'Clients can only be created inside individual test cases!',
            )
        }
        clientTestNameMap[this.clientId] = expect.getState().currentTestName
        this.sdkKey = `dvc_server_${this.clientId}`
    }

    protected getClientUrl() {
        return new URL(
            this.clientLocation ?? '',
            getConnectionStringForProxy(this.sdkName),
        ).href
    }

    async close() {}
}

export class LocalTestClient extends BaseTestClient {
    private shouldFailInit = false

    async createClient(
        waitForInitialization: boolean,
        options: Record<string, unknown> = {},
        sdkKey?: string | null,
        shouldFail = false,
    ) {
        this.shouldFailInit = shouldFail
        if (sdkKey !== undefined) {
            this.sdkKey = sdkKey
        } else if (process.env.TEST_HARNESS_SDK_KEY) {
            this.sdkKey = process.env.TEST_HARNESS_SDK_KEY
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
                ...options,
            },
        )

        await checkFailed(response, shouldFail)

        this.clientLocation = response.headers.get('location')
        return response
    }

    async callVariableValue(
        user: Record<string, unknown>,
        sdkName: string,
        key?: string,
        variableType?: string,
        defaultValue?: any,
        shouldFail = false,
    ) {
        const result = await callVariableValue(
            this.getClientUrl(),
            user,
            sdkName,
            false,
            key,
            variableType,
            defaultValue,
        )

        await checkFailed(result, shouldFail)
        return result
    }

    async callVariable(
        user: Record<string, unknown>,
        sdkName: string,
        key?: string,
        variableType?: string,
        defaultValue?: any,
        shouldFail = false,
    ) {
        const result = await callVariable(
            this.getClientUrl(),
            user,
            sdkName,
            false,
            key,
            variableType,
            defaultValue,
        )

        await checkFailed(result, shouldFail)
        return result
    }

    async callAllVariables(user: Record<string, unknown>, shouldFail = false) {
        const result = await callAllVariables(this.getClientUrl(), user, false)

        await checkFailed(result, shouldFail)
        return result
    }

    async close() {
        if (this.shouldFailInit) {
            return
        }
        const result = await sendCommand(this.getClientUrl(), {
            command: 'close',
            params: [],
            isAsync: true,
        })
        await checkFailed(result, false)
    }

    async callAllFeatures(user: Record<string, unknown>, shouldFail = false) {
        const result = await callAllFeatures(this.getClientUrl(), user, false)
        await checkFailed(result, shouldFail)
        return result
    }

    async callTrack(
        user: Record<string, unknown>,
        event: Record<string, unknown>,
        shouldFail = false,
    ) {
        const result = await callTrack(this.getClientUrl(), user, event, false)

        await checkFailed(result, shouldFail)

        return result
    }

    async callSetClientCustomData(
        data: Record<string, unknown>,
        shouldFail = false,
    ) {
        const result = await sendCommand(this.getClientUrl(), {
            command: 'setClientCustomData',
            params: [{ value: data }],
            isAsync: false,
        })

        await checkFailed(result, shouldFail)

        return result
    }
}

export class CloudTestClient extends BaseTestClient {
    async createClient(
        options: Record<string, unknown> = {},
        sdkKey?: string | null,
        shouldFail = false,
    ) {
        if (sdkKey !== undefined) {
            this.sdkKey = sdkKey
        } else if (process.env.TEST_HARNESS_SDK_KEY) {
            this.sdkKey = process.env.TEST_HARNESS_SDK_KEY
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
                ...options,
            },
        )

        await checkFailed(response, shouldFail)

        this.clientLocation = response.headers.get('location')
        return response
    }

    async callVariable(
        user: Record<string, unknown>,
        sdkName: string,
        key?: string,
        variableType?: string,
        defaultValue?: any,
        shouldFail = false,
    ) {
        const result = await callVariable(
            this.getClientUrl(),
            user,
            sdkName,
            true,
            key,
            variableType,
            defaultValue,
        )
        await checkFailed(result, shouldFail)
        return result
    }

    async callVariableValue(
        user: Record<string, unknown>,
        sdkName: string,
        key?: string,
        variableType?: string,
        defaultValue?: any,
        shouldFail = false,
    ) {
        const result = await callVariableValue(
            this.getClientUrl(),
            user,
            sdkName,
            true,
            key,
            variableType,
            defaultValue,
        )
        await checkFailed(result, shouldFail)
        return result
    }
    async callAllVariables(user: Record<string, unknown>, shouldFail = false) {
        const result = await callAllVariables(this.getClientUrl(), user, true)
        await checkFailed(result, shouldFail)
        return result
    }

    async callAllFeatures(user: Record<string, unknown>, shouldFail = false) {
        const result = await callAllFeatures(this.getClientUrl(), user, true)
        await checkFailed(result, shouldFail)
        return result
    }

    async callTrack(
        user: Record<string, unknown>,
        event: Record<string, unknown>,
        shouldFail = false,
    ) {
        const result = await callTrack(this.getClientUrl(), user, event, true)

        await checkFailed(result, shouldFail)

        return result
    }
}

export const expectErrorMessageToBe = (
    message: string,
    ...expected: string[]
) => {
    expect(message).toBeTruthy()
    let found = false
    for (const expectedMessage of expected) {
        if (message === expectedMessage) {
            found = true
            break
        }
    }
    // when we consolidate error messages to be uniform, change this to actually compare
    // the exception and the expected exception message
    if (!found) {
        console.warn(
            `Expected error message to be in: \n ${expected.join('\n')}\nbut got: \n ${message}`,
        )
    }
}

export const getPlatformBySdkName = (name: string) => {
    if (name === 'OF-NodeJS') {
        return 'NodeJS'
    }
    return name === 'DotNet' ? 'C#' : name
}
