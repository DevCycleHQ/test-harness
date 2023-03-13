import {
    describeCapability,
    forEachSDK,
    getPlatformBySdkName,
    LocalTestClient,
    waitForRequest
} from '../helpers'
import { Capabilities } from '../types'
import { getServerScope } from '../nock'
import { config } from '../mockData'
import { VariableType } from '@devcycle/types'
import { optionalEventFields, optionalUserEventFields } from '../mockData/events'

const scope = getServerScope()

const expectedVariable = {
    key: 'string-var',
    defaultValue: 'default_value',
    variationOn: 'string',
    variableType: 'String',
}

const variableType = VariableType.string

const bucketedEventMetadata = {
    _feature: "638680d6fcb67b96878d90e6",
    _variation: "638680d6fcb67b96878d90ec"
}

describe('Multithreading Tests', () => {
    forEachSDK((name) => {
        const expectedPlatform = getPlatformBySdkName(name, true)

        describeCapability(name, Capabilities.multithreading)(name, () => {
            let testClient: LocalTestClient
            let eventsUrl: string

            describe('initialized client', () => {
                beforeEach(async () => {
                    testClient = new LocalTestClient(name)

                    scope
                        .get(`/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`)
                        .reply(200, config)

                    await testClient.createClient(true, {
                        configPollingIntervalMS: 100000,
                        eventFlushIntervalMS: 500,
                        // set two thread workers to test multithreading
                        maxWasmWorkers: 2
                    })

                    eventsUrl = `/client/${testClient.clientId}/v1/events/batch`
                })

                const {key, defaultValue, variationOn} = expectedVariable

                it('should return variable if SDK returns object matching default type', async () => {
                    let eventBody = {}

                    const interceptor = scope.post(eventsUrl)
                    interceptor.reply((uri, body) => {
                        eventBody = body
                        return [201]
                    })

                    const variableResponse = await testClient.callVariable(
                        {user_id: 'user1', customData: {'should-bucket': true}},
                        key,
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
                    expectEventBody(eventBody, key, 'aggVariableEvaluated')
                })

                it('should aggregate events across threads', async () => {
                    let eventBodies = []

                    const interceptor = scope.post(eventsUrl).times(2)
                    interceptor.reply((uri, body) => {
                        eventBodies.push( body)
                        return [201]
                    })

                    await Promise.all([
                        testClient.callVariable(
                            {user_id: 'user1', customData: {'should-bucket': true}},
                            key,
                            defaultValue
                        ),
                        testClient.callVariable(
                            {user_id: 'user1', customData: {'should-bucket': true}},
                            key,
                            defaultValue
                        ),
                        testClient.callVariable(
                            {user_id: 'user1', customData: {'should-bucket': true}},
                            key,
                            defaultValue
                        ),
                        testClient.callVariable(
                            {user_id: 'user1', customData: {'should-bucket': true}},
                            key,
                            defaultValue
                        )
                    ])

                    // waits for the request to the events API
                    await waitForRequest(scope, interceptor, 600, 'Event callback timed out')

                    // Expect that the SDK sends an "aggVariableEvaluated" event per thread
                    expectEventBody(eventBodies[0], key, 'aggVariableEvaluated', expect.any(Number))
                    expectEventBody(eventBodies[1], key, 'aggVariableEvaluated', expect.any(Number))
                    // expect that in total we tracked four evaluations
                    expect(eventBodies[0].batch[0].events[0].value + eventBodies[1].batch[0].events[0].value).toEqual(4)
                })

                describeCapability(name, Capabilities.clientCustomData)(name, () => {
                    it('should set client custom data and use it for segmentation', async () => {
                        const interceptor = scope
                            .post(eventsUrl)
                            .times(2)

                        interceptor
                            .reply(201)


                        const customData = { 'should-bucket': true }
                        await testClient.callSetClientCustomData(customData)
                        const user = { user_id: 'test-user'}
                        const responses = await Promise.all([
                            testClient.callVariable(user, 'string-var', 'some-default'),
                            testClient.callVariable(user, 'string-var', 'some-default'),
                            testClient.callVariable(user, 'string-var', 'some-default'),
                            testClient.callVariable(user, 'string-var', 'some-default')

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

                const {key, defaultValue} = expectedVariable

                it('should return default value if client is uninitialized, log event', async () => {
                    testClient = new LocalTestClient(name)
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
                        {user_id: 'user1', customData: {'should-bucket': true}},
                        key,
                        defaultValue
                    )
                    const variable = await variableResponse.json()
                    expectDefaultValue(key, variable, defaultValue, variableType)

                    await waitForRequest(scope, interceptor, 600, 'Event callback timed out')
                    expectEventBody(eventBody, key, 'aggVariableDefaulted', 1)
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
                type
            },
            logs: []
        })
    }
})
