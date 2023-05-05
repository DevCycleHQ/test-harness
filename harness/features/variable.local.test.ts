import {
    describeCapability,
    forEachVariableType,
    getPlatformBySdkName,
    getSDKScope,
    hasCapability,
    LocalTestClient,
    waitForRequest
} from '../helpers'
import { Capabilities } from '../types'
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

        describe('initialized client', () => {
            beforeEach(async () => {
                testClient = new LocalTestClient(sdkName)
                // This allows us to mock out the our specific client (using the clientId),
                // allowing us to have multiple clients serving different clients without
                // conflicting. This one is used to mock the config that the local client is going to use
                // locally in all of its methods.
                scope
                    .get(`/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`)
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

                it('should return variable if mock server returns object matching default type', async () => {
                    const eventResult = interceptEvents(sdkName, eventsUrl)

                    const variableResponse = await testClient.callVariable(
                        { user_id: 'user1', customData: { 'should-bucket': true } },
                        key,
                        defaultValue
                    )
                    const variable = await variableResponse.json()

                    // Expect that the variable returned is not defaulted and has a value,
                    // with an entity type "Variable"
                    expect(variable).toEqual(expect.objectContaining({
                        entityType: 'Variable',
                        data: {
                            type: variableType,
                            isDefaulted: false,
                            key,
                            defaultValue: defaultValue,
                            value: variationOn,
                            evalReason: expect.toBeNil()
                        }
                    }))

                    if (!hasCapability(sdkName, Capabilities.events)) {
                        return
                    }

                    // waits for the request to the events API
                    await eventResult.wait()

                    // Expect that the SDK sends an "aggVariableEvaluated" event
                    // for the variable call
                    expectEventBody(eventResult.body, key, 'aggVariableEvaluated')
                })

                it('should return default value if default type doesn\'t match variable type',  async () => {
                    const eventResult = interceptEvents(sdkName, eventsUrl)

                    const wrongTypeDefault = type === 'number' ? '1' : 1
                    const variableResponse =
                        await testClient.callVariable(
                            { user_id: 'user1', customData: { 'should-bucket': true } },
                            key,
                            wrongTypeDefault
                        )
                    const variable = await variableResponse.json()

                    // Expect that the test returns a defaulted variable
                    expectDefaultValue(key, variable, wrongTypeDefault,
                        wrongTypeDefault === '1' ? VariableType.string : VariableType.number)

                    if (!hasCapability(sdkName, Capabilities.events)) {
                        return
                    }

                    await eventResult.wait()

                    // Expects that the SDK sends an "aggVariableDefaulted" event for the
                    // defaulted variable
                    expectEventBody(eventResult.body, key, 'aggVariableDefaulted')
                })

                it('should return default value if user is not bucketed into variable',  async () => {
                    const eventResult = interceptEvents(sdkName, eventsUrl)
                    const variableResponse = await testClient.callVariable(
                        { user_id: 'user3' },
                        key,
                        defaultValue
                    )
                    const variable = await variableResponse.json()

                    expectDefaultValue(key, variable, defaultValue, variableType)

                    if (!hasCapability(sdkName, Capabilities.events)) {
                        return
                    }

                    await eventResult.wait()

                    expectEventBody(eventResult.body, key, 'aggVariableDefaulted')
                })

                it('should return default value if variable doesn\'t exist',  async () => {
                    const eventResult = interceptEvents(sdkName, eventsUrl)

                    const variableResponse = await testClient.callVariable(
                        { user_id: 'user1', customData: { 'should-bucket': true } },
                        'nonexistent',
                        defaultValue
                    )
                    const variable = await variableResponse.json()

                    expectDefaultValue('nonexistent', variable, defaultValue, variableType)

                    if (!hasCapability(sdkName, Capabilities.events)) {
                        return
                    }

                    await eventResult.wait()

                    expectEventBody(eventResult.body, 'nonexistent', 'aggVariableDefaulted')
                })

                it('should aggregate aggVariableDefaulted events',  async () => {
                    const eventResult = interceptEvents(sdkName, eventsUrl)

                    await testClient.callVariable(
                        { user_id: 'user1', customData: { 'should-bucket': true } },
                        'nonexistent',
                        defaultValue
                    )
                    await testClient.callVariable(
                        { user_id: 'user1', customData: { 'should-bucket': true } },
                        'nonexistent',
                        defaultValue
                    )

                    if (!hasCapability(sdkName, Capabilities.events)) {
                        return
                    }

                    await eventResult.wait()
                    expectEventBody(eventResult.body, 'nonexistent', 'aggVariableDefaulted', 2)
                })

                it('should aggregate aggVariableEvaluated events',  async () => {
                    const eventResult = interceptEvents(sdkName, eventsUrl)

                    await testClient.callVariable(
                        { user_id: 'user1', customData: { 'should-bucket': true } },
                        key,
                        defaultValue
                    )
                    await testClient.callVariable(
                        { user_id: 'user1', customData: { 'should-bucket': true } },
                        key,
                        defaultValue
                    )

                    if (!hasCapability(sdkName, Capabilities.events)) {
                        return
                    }
                    await eventResult.wait()
                    expectEventBody(eventResult.body, key, 'aggVariableEvaluated', 2)
                })
            })

            it('should return a valid unicode string',  async () => {
                const eventResult = interceptEvents(sdkName, eventsUrl)

                const variableResponse = await testClient.callVariable(
                    { user_id: 'user1', customData: { 'should-bucket': true } },
                    'unicode-var',
                    'default'
                )
                const variable = await variableResponse.json()

                expect(variable).toEqual(expect.objectContaining({
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
                }))

                if (!hasCapability(sdkName, Capabilities.events)) {
                    return
                }

                await eventResult.wait()
                expectEventBody(eventResult.body, 'unicode-var', 'aggVariableEvaluated', 1)
            })
        })

        describe('uninitialized client', () => {
            let testClient: LocalTestClient

            beforeEach(async () => {

            })

            forEachVariableType((type) => {
                const { key, defaultValue, variableType } = expectedVariablesByType[type]

                it('should return default value if client is uninitialized, log event',  async () => {
                    testClient = new LocalTestClient(sdkName)
                    const configRequestUrl = `/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`
                    scope
                        .get(configRequestUrl)
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

                    const variableResponse = await testClient.callVariable(
                        { user_id: 'user1', customData: { 'should-bucket': true } },
                        key,
                        defaultValue
                    )
                    const variable = await variableResponse.json()
                    expectDefaultValue(key, variable, defaultValue, variableType)

                    if (!hasCapability(sdkName, Capabilities.events)) {
                        return
                    }

                    await eventResult.wait()
                    expectEventBody(eventResult.body, key, 'aggVariableDefaulted', 1)
                })

                it('should return default value if client config failed, log event',  async () => {
                    testClient = new LocalTestClient(sdkName)
                    const configRequestUrl = `/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`
                    scope
                        .get(configRequestUrl)
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

                    const variableResponse = await testClient.callVariable(
                        { user_id: 'user1', customData: { 'should-bucket': true } },
                        key,
                        defaultValue
                    )
                    const variable = await variableResponse.json()
                    expectDefaultValue(key, variable, defaultValue, variableType)

                    if (!hasCapability(sdkName, Capabilities.events)) {
                        return
                    }

                    await eventResult.wait()
                    expectEventBody(eventResult.body, key, 'aggVariableDefaulted', 1)
                })
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

    const expectDefaultValue = (
        key: string,
        variable: VariableResponse,
        defaultValue: ValueTypes,
        type: VariableType) => {
        expect(variable).toEqual({
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
            return [201]
        })
        return eventResult
    }
})
