import {
    describeCapability,
    forEachVariableType,
    getPlatformBySdkName,
    getSDKScope,
    hasCapability,
    LocalTestClient,
    waitForRequest
} from '../helpers'
import { Capabilities, SDKCapabilities } from '../types'
import { config } from '../mockData'
import { VariableType } from '@devcycle/types'
import { optionalEventFields, optionalUserEventFields } from '../mockData/events'

const expectedVariablesByType = {
    // these should match the config in mockData
    string: {
        key: 'string-var',
        defaultValue: 'default_value',
        variationOn: 'string',
        variableType: 'String',
    },
    number: {
        key: 'number-var',
        defaultValue: 0,
        variationOn: 1,
        variableType: 'Number',
    },
    boolean: {
        key: 'bool-var',
        defaultValue: false,
        variationOn: true,
        variableType: 'Boolean',
    },
    JSON: {
        key: 'json-var',
        defaultValue: {},
        variationOn: {
            'facts': true
        },
        variableType: 'JSON',
    }
}

const bucketedEventMetadata = {
    _feature: '638680d6fcb67b96878d90e6',
    _variation: '638680d6fcb67b96878d90ec'
}

describe('Variable Tests - Local', () => {
    // This helper method fetches the current SDK we are testing for the current jest project (see jest.config.js).
    // All supported SDKs can be found under harness/types/sdks.ts
    // it also returns our proxy scope that is used to mock endpoints that are called in the SDK.
    const { sdkName, scope } = getSDKScope()

    const expectedPlatform = getPlatformBySdkName(sdkName, true)

    // This describeCapability only runs if the SDK has the "local" capability.
    // Capabilities are located under harness/types/capabilities and follow the same
    // name mapping from the sdks.ts file under harness/types/sdks.ts
    describeCapability(sdkName, Capabilities.local)(sdkName, () => {
        let testClient: LocalTestClient
        let eventsUrl: string

        const hasVariableValue = SDKCapabilities[sdkName].includes(Capabilities.variableValue)
        const callVariableMethods = hasVariableValue ? ['variable', 'variableValue'] : ['variable']

        function callVariableMethod(method: string) {
            if (method === 'variableValue') {
                return testClient.callVariableValue.bind(testClient)
            } else {
                return testClient.callVariable.bind(testClient)
            }
        }

        describe('initialized client', () => {
            beforeEach(async () => {
                testClient = new LocalTestClient(sdkName)
                // This allows us to mock out the our specific client (using the clientId),
                // allowing us to have multiple clients serving different clients without
                // conflicting. This one is used to mock the config that the local client is going to use
                // locally in all of its methods.
                scope.get(`/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`)
                    .reply(200, config)

                // Creating a client will pass to the proxy server by default:
                // - sdk key based on the client id created when creating the client
                // - urls for the bucketing/config/events endpoints to redirect traffic
                // into the proxy server so nock can mock out the responses
                //, or should expect it to error out
                // also it sets the client location which can be used
                // to access the client instance on the proxy server so we can
                // refer to the correct instance from multiple client instances
                // the waitForInitialization param is used to wait for the config
                // to come back on the proxy server before resolving this promise
                await testClient.createClient(true, {
                    configPollingIntervalMS: 100000,
                    eventFlushIntervalMS: 500,
                })

                eventsUrl = `/client/${testClient.clientId}/v1/events/batch`
            })

            // Instead of writing tests for each different type we support (String, Boolean, Number, JSON),
            // this function enumerates each type and runs all tests encapsulated within it
            // to condense repeated tests.
            forEachVariableType((type) => {
                const { key, defaultValue, variationOn, variableType } = expectedVariablesByType[type]

                it.each(callVariableMethods)('should return %s if mock server returns object matching default type',
                    async (method) => {
                        const eventResult = interceptEvents(sdkName, eventsUrl)

                        const variableResponse = await callVariableMethod(method)(
                            { user_id: 'user1', customData: { 'should-bucket': true } },
                            sdkName,
                            key,
                            type,
                            defaultValue
                        )
                        const variable = await variableResponse.json()

                        // Expect that the variable returned is not defaulted and has a value,
                        // with an entity type "Variable"
                        expectVariableResponse(variable, method, {
                            entityType: 'Variable',
                            data: {
                                type: variableType,
                                isDefaulted: false,
                                key,
                                defaultValue: defaultValue,
                                value: variationOn,
                                evalReason: expect.toBeNil()
                            }
                        })

                        if (!hasCapability(sdkName, Capabilities.events)) {
                            return
                        }

                        // waits for the request to the events API
                        await eventResult.wait()

                        // Expect that the SDK sends an "aggVariableEvaluated" event
                        // for the variable call
                        expectEventBody(eventResult.body, key, 'aggVariableEvaluated')
                    }
                )

                const testFn = sdkName === 'OF-NodeJS'
                    ? it.skip.each(callVariableMethods)
                    : it.each(callVariableMethods)
                testFn('should return default value if default type doesn\'t match %s type',  async (method) => {
                    const eventResult = interceptEvents(sdkName, eventsUrl)

                    const wrongTypeDefault = type === 'number' ? '1' : 1
                    const variableResponse = await callVariableMethod(method)(
                        { user_id: 'user1', customData: { 'should-bucket': true } },
                        sdkName,
                        key,
                        type,
                        wrongTypeDefault
                    )
                    const variable = await variableResponse.json()

                    // Expect that the test returns a defaulted variable
                    expectDefaultValue(
                        key,
                        variable,
                        method,
                        wrongTypeDefault,
                        wrongTypeDefault === '1' ? VariableType.string : VariableType.number
                    )

                    if (!hasCapability(sdkName, Capabilities.events)) {
                        return
                    }

                    await eventResult.wait()

                    // Expects that the SDK sends an "aggVariableDefaulted" event for the
                    // defaulted variable
                    if (!hasCapability(sdkName, Capabilities.cloudProxy)) {
                        expectEventBody(eventResult.body, key, 'aggVariableDefaulted')
                    } else {
                        expectEventBody(eventResult.body, key, 'aggVariableEvaluated')
                    }
                })

                it.each(callVariableMethods)('should return default value if user is not bucketed into %s',
                    async (method) => {
                        const eventResult = interceptEvents(sdkName, eventsUrl)
                        const variableResponse = await callVariableMethod(method)(
                            { user_id: 'user3' },
                            sdkName,
                            key,
                            type,
                            defaultValue
                        )
                        const variable = await variableResponse.json()

                        expectDefaultValue(key, variable, method, defaultValue, variableType)

                        if (!hasCapability(sdkName, Capabilities.events)) {
                            return
                        }

                        await eventResult.wait()

                        expectEventBody(eventResult.body, key, 'aggVariableDefaulted')
                    }
                )

                it.each(callVariableMethods)('should return default value if %s doesn\'t exist',
                    async (method) => {
                        const eventResult = interceptEvents(sdkName, eventsUrl)

                        const variableResponse = await callVariableMethod(method)(
                            { user_id: 'user1', customData: { 'should-bucket': true } },
                            sdkName,
                            'nonexistent',
                            type,
                            defaultValue
                        )
                        const variable = await variableResponse.json()

                        expectDefaultValue('nonexistent', variable, method, defaultValue, variableType)

                        if (!hasCapability(sdkName, Capabilities.events)) {
                            return
                        }

                        await eventResult.wait()

                        expectEventBody(eventResult.body, 'nonexistent', 'aggVariableDefaulted')
                    }
                )

                it.each(callVariableMethods)('should aggregate aggVariableDefaulted events for %s', async (method) => {
                    const eventResult = interceptEvents(sdkName, eventsUrl)

                    await callVariableMethod(method)(
                        { user_id: 'user1', customData: { 'should-bucket': true } },
                        sdkName,
                        'nonexistent',
                        type,
                        defaultValue
                    )
                    await callVariableMethod(method)(
                        { user_id: 'user1', customData: { 'should-bucket': true } },
                        sdkName,
                        'nonexistent',
                        type,
                        defaultValue
                    )

                    if (!hasCapability(sdkName, Capabilities.events)) {
                        return
                    }

                    await eventResult.wait()
                    expectEventBody(eventResult.body, 'nonexistent', 'aggVariableDefaulted', 2)
                })

                it.each(callVariableMethods)('should aggregate aggVariableEvaluated events for %s', async (method) => {
                    const eventResult = interceptEvents(sdkName, eventsUrl)

                    await callVariableMethod(method)(
                        { user_id: 'user1', customData: { 'should-bucket': true } },
                        sdkName,
                        key,
                        type,
                        defaultValue
                    )
                    await callVariableMethod(method)(
                        { user_id: 'user1', customData: { 'should-bucket': true } },
                        sdkName,
                        key,
                        type,
                        defaultValue
                    )

                    if (!hasCapability(sdkName, Capabilities.events)) {
                        return
                    }
                    await eventResult.wait()
                    expectEventBody(eventResult.body, key, 'aggVariableEvaluated', 2)
                })
            })

            it.each(callVariableMethods)('should return a valid unicode string for %s',  async (method) => {
                const eventResult = interceptEvents(sdkName, eventsUrl)

                const variableResponse = await callVariableMethod(method)(
                    { user_id: 'user1', customData: { 'should-bucket': true } },
                    sdkName,
                    'unicode-var',
                    'string',
                    'default'
                )
                const variable = await variableResponse.json()

                expectVariableResponse(variable, method, {
                    entityType: 'Variable',
                    data: {
                        type: VariableType.string,
                        isDefaulted: false,
                        key: 'unicode-var',
                        defaultValue: 'default',
                        value: '↑↑↓↓←→←→BA 🤖',
                        evalReason: expect.toBeNil()
                    },
                    logs: []
                })

                if (!hasCapability(sdkName, Capabilities.events)) {
                    return
                }

                await eventResult.wait()
                expectEventBody(eventResult.body, 'unicode-var', 'aggVariableEvaluated', 1)
            })
        })

        describe('uninitialized client', () => {

            forEachVariableType((type) => {
                const { key, defaultValue, variableType } = expectedVariablesByType[type]

                const testFn = hasCapability(sdkName, Capabilities.cloudProxy)
                    ? it.skip.each(callVariableMethods)
                    : it.each(callVariableMethods)
                testFn('should return %s default value if client is uninitialized, log event',
                    async (method) => {
                        testClient = new LocalTestClient(sdkName)
                        const configRequestUrl =
                            `/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`

                        scope.get(configRequestUrl)
                            .delay(2000)
                            .reply(200)

                        eventsUrl = `/client/${testClient.clientId}/v1/events/batch`

                        // A special option is passed in to prevent the proxy server from waiting
                        // for the client to have a config for the purposes of this uninitialized test suite
                        // (The call to the proxy server is still awaited)
                        await testClient.createClient(false, {
                            eventFlushIntervalMS: 500
                        })

                        const eventResult = interceptEvents(sdkName, eventsUrl)

                        const variableResponse = await callVariableMethod(method)(
                            { user_id: 'user1', customData: { 'should-bucket': true } },
                            sdkName,
                            key,
                            type,
                            defaultValue
                        )
                        const variable = await variableResponse.json()
                        expectDefaultValue(key, variable, method, defaultValue, variableType)

                        if (!hasCapability(sdkName, Capabilities.events)) {
                            return
                        }

                        await eventResult.wait()
                        expectEventBody(eventResult.body, key, 'aggVariableDefaulted', 1)
                    }
                )

                it.each(callVariableMethods)('should return default value for %s if client config failed, log event',
                    async (method) => {

                        testClient = new LocalTestClient(sdkName)
                        const configRequestUrl =
                            `/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`

                        scope.get(configRequestUrl)
                            // account for the immediate retry of the request
                            .times(2)
                            .reply(500)

                        eventsUrl = `/client/${testClient.clientId}/v1/events/batch`

                        // A special option is passed in to prevent the proxy server from waiting
                        // for the client to have a config for the purposes of this uninitialized test suite
                        // (The call to the proxy server is still awaited)
                        await testClient.createClient(false, {
                            eventFlushIntervalMS: 500
                        })

                        const eventResult = interceptEvents(sdkName, eventsUrl)

                        const variableResponse = await callVariableMethod(method)(
                            { user_id: 'user1', customData: { 'should-bucket': true } },
                            sdkName,
                            key,
                            type,
                            defaultValue
                        )
                        const variable = await variableResponse.json()
                        expectDefaultValue(key, variable, method, defaultValue, variableType)

                        if (!hasCapability(sdkName, Capabilities.events)) {
                            return
                        }

                        await eventResult.wait()
                        expectEventBody(eventResult.body, key, 'aggVariableDefaulted', 1)
                    }
                )
            })
        })

        const expectEventBody = (
            body: Record<string, unknown>,
            variableId: string,
            eventType: string,
            value?: number
        ) => {
            expect(body).toEqual({
                batch: [{
                    user: {
                        ...optionalUserEventFields,
                        user_id: expect.any(String),
                        platform: expectedPlatform,
                        sdkType: 'server'
                    },
                    events: [
                        {
                            ...optionalEventFields,
                            user_id: expect.any(String),
                            type: eventType,
                            target: variableId,
                            metaData: eventType === 'aggVariableEvaluated' ? bucketedEventMetadata : expect.toBeNil(),
                            // featureVars is always empty for aggregated evaluation events
                            featureVars: {},
                            value: value !== undefined ? value : 1,
                            customType: expect.toBeNil()
                        }
                    ]
                }]
            })
        }
    })

    type ValueTypes = string | boolean | number | JSON

    type VariableResponse = {
        entityType: string,
        data: {
            value: ValueTypes,
            isDefaulted: boolean,
            type: string,
            defaultValue: ValueTypes
        }
    }

    const expectVariableResponse = (variable, method, expectObj) => {
        expect(variable).toEqual(expect.objectContaining(
            method === 'variable' ? expectObj : {
                data: expectObj.data?.value
            }
        ))
    }

    const expectDefaultValue = (
        key: string,
        variable: VariableResponse,
        method: string,
        defaultValue: ValueTypes,
        type: VariableType) => {
        expectVariableResponse(variable, method, {
            entityType: 'Variable',
            data: {
                isDefaulted: true,
                defaultValue: defaultValue,
                value: defaultValue,
                key: key,
                type,
                evalReason: expect.toBeNil()
            },
            logs: []
        })
    }

    const interceptEvents = (sdkName: string, eventsUrl: string) => {
        if (!hasCapability(sdkName, Capabilities.events)) {
            return
        }
        // The interceptor instance is used to wait on events that are triggered when calling
        // methods so that we can verify events being sent out and mock out responses from the
        // event server
        const interceptor = scope.post(eventsUrl)

        const eventResult = {
            body: {},
            wait: () => waitForRequest(scope, interceptor, 600, 'Event callback timed out')
        }

        interceptor.reply((uri, body) => {
            eventResult.body = body
            return [201, { message:'Successfully received events.' }]
        })
        return eventResult
    }
})
