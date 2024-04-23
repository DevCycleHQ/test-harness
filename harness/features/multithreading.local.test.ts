import {
    describeCapability,
    getPlatformBySdkName,
    getSDKScope,
    LocalTestClient,
    waitForRequest
} from '../helpers'
import { Capabilities } from '../types'
import { config } from '../mockData'
import { VariableType } from '@devcycle/types'
import { expectAggregateDefaultEvent, expectAggregateEvaluationEvent } from '../helpers'

const expectedVariable = {
    key: 'string-var',
    defaultValue: 'default_value',
    variationOn: 'string',
    variableType: 'String',
}

const variableType = VariableType.string

const featureId = '638680d6fcb67b96878d90e6'
const variationId = '638680d6fcb67b96878d90ec'

describe('Multithreading Tests', () => {
    const { sdkName, scope } = getSDKScope()

    const expectedPlatform = getPlatformBySdkName(sdkName)

    describeCapability(sdkName, Capabilities.multithreading)(sdkName, () => {
        let testClient: LocalTestClient
        let eventsUrl: string

        describe('initialized client', () => {
            beforeEach(async () => {
                testClient = new LocalTestClient(sdkName)

                scope
                    .get(`/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`)
                    .reply(200, config, {ETag: 'multithreading-etag', 'Cf-Ray': 'multithreading-rayid'})

                await testClient.createClient(true, {
                    configPollingIntervalMS: 100000,
                    eventFlushIntervalMS: 500,
                    // set two thread workers to test multithreading
                    maxWasmWorkers: 2
                })

                eventsUrl = `/client/${testClient.clientId}/v1/events/batch`
            })

            const { key, defaultValue, variationOn } = expectedVariable

            it('should return variable if SDK returns object matching default type', async () => {
                let eventBody = {}

                const interceptor = scope.post(eventsUrl)
                interceptor.reply((uri, body) => {
                    eventBody = body
                    return [201]
                })

                const variableResponse = await testClient.callVariable(
                    { user_id: 'user1', customData: { 'should-bucket': true } },
                    sdkName,
                    key,
                    variableType,
                    defaultValue
                )
                const variable = await variableResponse.json()

                // waits for the request to the events API
                await waitForRequest(scope, interceptor, 600, 'Event callback timed out')

                // Expect that the variable returned is not defaulted and has a value,
                // with an entity type "Variable"
                expect(variable).toEqual(expect.objectContaining({
                    entityType: 'Variable',
                    data: {
                        type: variableType,
                        isDefaulted: false,
                        key,
                        defaultValue: defaultValue,
                        value: variationOn
                    }
                }))

                // Expect that the SDK sends an "aggVariableEvaluated" event
                // for the variable call
                expectAggregateEvaluationEvent({body: eventBody, variableKey: key, featureId, variationId, etag: 'multithreading-etag', rayId: 'multithreading-rayid'})
            })

            it('should aggregate events across threads', async () => {
                const eventBodies = []

                const interceptor = scope.post(eventsUrl)
                interceptor.reply((uri, body) => {
                    eventBodies.push( body)
                    return [201]
                })

                await Promise.all([
                    testClient.callVariable(
                        { user_id: 'user1', customData: { 'should-bucket': true } },
                        sdkName,
                        key,
                        variableType,
                        defaultValue
                    ),
                    testClient.callVariable(
                        { user_id: 'user1', customData: { 'should-bucket': true } },
                        sdkName,
                        key,
                        variableType,
                        defaultValue
                    ),
                    testClient.callVariable(
                        { user_id: 'user1', customData: { 'should-bucket': true } },
                        sdkName,
                        key,
                        variableType,
                        defaultValue
                    ),
                    testClient.callVariable(
                        { user_id: 'user1', customData: { 'should-bucket': true } },
                        sdkName,
                        key,
                        variableType,
                        defaultValue
                    )
                ])

                // waits for the request to the events API
                await waitForRequest(scope, interceptor, 600, 'Event callback timed out')

                // Expect that the SDK sends a single "aggVariableEvaluated" event
                expect(eventBodies.length).toEqual(1)
                expectAggregateEvaluationEvent({body: eventBodies[0], variableKey: key, featureId, variationId, value: 4, etag: 'multithreading-etag', rayId: 'multithreading-rayid'})
            })

            it('should retry events across threads', async () => {
                const eventBodies = []

                scope.post(eventsUrl).reply(500)

                const interceptor2 = scope.post(eventsUrl)
                interceptor2.reply((uri, body) => {
                    eventBodies.push( body)
                    return [201]
                })

                await Promise.all([
                    testClient.callVariable(
                        { user_id: 'user1', customData: { 'should-bucket': true } },
                        sdkName,
                        key,
                        variableType,
                        defaultValue
                    ),
                    testClient.callVariable(
                        { user_id: 'user1', customData: { 'should-bucket': true } },
                        sdkName,
                        key,
                        variableType,
                        defaultValue
                    ),
                    testClient.callVariable(
                        { user_id: 'user1', customData: { 'should-bucket': true } },
                        sdkName,
                        key,
                        variableType,
                        defaultValue
                    ),
                    testClient.callVariable(
                        { user_id: 'user1', customData: { 'should-bucket': true } },
                        sdkName,
                        key,
                        variableType,
                        defaultValue
                    )
                ])

                // waits for the request to the events API
                await waitForRequest(scope, interceptor2, 1200, 'Retried event requests not received')

                // Expect that the SDK sends a single "aggVariableEvaluated" event
                expect(eventBodies.length).toEqual(1)
                expectAggregateEvaluationEvent({body: eventBodies[0], variableKey: key, featureId, variationId, value: 4, etag: 'multithreading-etag', rayId: 'multithreading-rayid'})
            })

            describeCapability(sdkName, Capabilities.clientCustomData)(sdkName, () => {
                it('should set client custom data and use it for segmentation', async () => {
                    const interceptor = scope
                        .post(eventsUrl)

                    interceptor
                        .reply(201)

                    const customData = { 'should-bucket': true }
                    await testClient.callSetClientCustomData(customData)
                    const user = { user_id: 'test-user' }
                    const responses = await Promise.all([
                        testClient.callVariable(user, sdkName, 'string-var', 'string', 'some-default'),
                        testClient.callVariable(user, sdkName, 'string-var', 'string', 'some-default'),
                        testClient.callVariable(user, sdkName, 'string-var', 'string', 'some-default'),
                        testClient.callVariable(user, sdkName, 'string-var', 'string', 'some-default')
                    ])

                    for (const response of responses) {
                        const variable = await response.json()
                        expect(variable).toEqual(expect.objectContaining({
                            entityType: 'Variable',
                            data: {
                                type: 'String',
                                isDefaulted: false,
                                key: 'string-var',
                                defaultValue: 'some-default',
                                value: 'string'
                            }
                        }))
                    }

                    await waitForRequest(scope, interceptor, 600, 'Event callback timed out')
                })
            })
        })

        describe('uninitialized client', () => {
            let testClient: LocalTestClient

            const { key, defaultValue } = expectedVariable

            it('should return default value if client is uninitialized, log event', async () => {
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

                let eventBody = {}
                const interceptor = scope.post(eventsUrl)
                interceptor.reply((uri, body) => {
                    eventBody = body
                    return [201]
                })

                const variableResponse = await testClient.callVariable(
                    { user_id: 'user1', customData: { 'should-bucket': true } },
                    sdkName,
                    key,
                    variableType,
                    defaultValue
                )
                const variable = await variableResponse.json()
                expectDefaultValue(key, variable, defaultValue, variableType)

                await waitForRequest(scope, interceptor, 600, 'Event callback timed out')
                expectAggregateDefaultEvent({body: eventBody, variableKey: key, defaultReason: 'MISSING_CONFIG', etag: null, rayId: null})
            })
        })
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
                type
            },
            logs: []
        })
    }
})
