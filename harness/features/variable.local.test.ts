import {
    describeCapability,

    forEachSDK,
    forEachVariableType,
    getPlatformBySdkName,
    LocalTestClient,
    waitForRequest
} from '../helpers'
import { Capabilities, SDKCapabilities } from '../types'
import { getServerScope } from '../nock'
import { config } from '../mockData'
import { VariableType } from '@devcycle/types'

jest.setTimeout(10000)

const scope = getServerScope()

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

describe('Variable Tests - Local', () => {
    forEachSDK((name) => {
        const expectedPlatform = getPlatformBySdkName(name, true)

        describeCapability(name, Capabilities.local)(name, () => {
            const testClient = new LocalTestClient(name)
            let eventsUrl: string

            describe('initialized client', () => {
                beforeAll(async () => {
                    // mock endpoints
                    scope
                        .get(`/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`)
                        .reply(200, config)

                    // create client
                    await testClient.createClient(true,{
                        configPollingIntervalMS: 100000,
                        eventFlushIntervalMS: 500,
                    })

                    eventsUrl = `/${testClient.clientLocation}/v1/events/batch`
                })
                afterAll(async () => {
                    await testClient.close()
                })

                forEachVariableType((type) => {
                    const { key, defaultValue, variationOn, variableType } = expectedVariablesByType[type]

                    it('should return variable if mock server returns object matching default type',  async () => {
                        let eventBody = {}
                        const interceptor = scope.post(eventsUrl)
                        interceptor.reply((uri, body) => {
                            eventBody = body
                            return [201]
                        })

                        const variableResponse = await testClient.callVariable(
                            { user_id: 'user1', customData: { 'should-bucket': true } },
                            key,
                            defaultValue
                        )
                        const variable = await variableResponse.json()
                        await waitForRequest(scope, interceptor, 600, 'Event callback timed out')

                        expect(variable).toEqual(expect.objectContaining({
                            entityType: 'Variable',
                            data: expect.objectContaining({
                                isDefaulted: false,
                                defaultValue: defaultValue,
                                value: variationOn
                            })
                        }))

                        expectEventBody(eventBody, key, 'aggVariableEvaluated')
                    })

                    it('should return default value if default type doesn\'t match variable type',  async () => {
                        let eventBody = {}
                        const interceptor = scope.post(eventsUrl)
                        interceptor.reply((uri, body) => {
                            eventBody = body
                            return [201]
                        })

                        const wrongTypeDefault = type === 'number' ? '1' : 1
                        const variableResponse =
                            await testClient.callVariable(
                                { user_id: 'user1', customData: { 'should-bucket': true } },
                                key,
                                wrongTypeDefault
                            )
                        const variable = await variableResponse.json()
                        await waitForRequest(scope, interceptor, 600, 'Event callback timed out')

                        expectDefaultValue(key, variable, wrongTypeDefault,
                            wrongTypeDefault === '1' ? VariableType.string : VariableType.number)
                        expectEventBody(eventBody, key, 'aggVariableDefaulted')
                    })

                    it('should return default value if user is not bucketed into variable',  async () => {
                        let eventBody = {}
                        const interceptor = scope.post(eventsUrl)
                        interceptor.reply((uri, body) => {
                            eventBody = body
                            return [201]
                        })
                        const variableResponse = await testClient.callVariable(
                            { user_id: 'user3' },
                            key,
                            defaultValue
                        )
                        const variable = await variableResponse.json()
                        await waitForRequest(scope, interceptor, 600, 'Event callback timed out')

                        expectDefaultValue(key, variable, defaultValue, variableType)
                        expectEventBody(eventBody, key, 'aggVariableDefaulted')
                    })

                    it('should return default value if variable doesn\' exist',  async () => {
                        let eventBody = {}
                        const interceptor = scope.post(eventsUrl)
                        interceptor.reply((uri, body) => {
                            eventBody = body
                            return [201]
                        })

                        const variableResponse = await testClient.callVariable(
                            { user_id: 'user1', customData: { 'should-bucket': true } },
                            'nonexistent',
                            defaultValue
                        )
                        const variable = await variableResponse.json()
                        await waitForRequest(scope, interceptor, 600, 'Event callback timed out')

                        expectDefaultValue('nonexistent', variable, defaultValue, variableType)
                        expectEventBody(eventBody, 'nonexistent', 'aggVariableDefaulted')
                    })

                    it('should aggregate aggVariableDefaulted events',  async () => {
                        let eventBody = {}
                        const interceptor = scope.post(eventsUrl)
                        interceptor.reply((uri, body) => {
                            eventBody = body
                            return [201]
                        })

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

                        await waitForRequest(scope, interceptor, 600, 'Event callback timed out')
                        expectEventBody(eventBody, 'nonexistent', 'aggVariableDefaulted', 2)
                    })

                    it('should aggregate aggVariableEvaluated events',  async () => {
                        let eventBody = {}
                        const interceptor = scope.post(eventsUrl)
                        interceptor.reply((uri, body) => {
                            eventBody = body
                            return [201]
                        })

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

                        await waitForRequest(scope, interceptor, 600, 'Event callback timed out')
                        expectEventBody(eventBody, key, 'aggVariableEvaluated', 2)
                    })
                })
            })

            describe('uninitialized client', () => {
                const testClient = new LocalTestClient(name)

                beforeAll(async () => {
                    const configRequestUrl = `/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`
                    const interceptor = scope
                        .get(configRequestUrl)

                    interceptor.reply(404)

                    await testClient.createClient(false)

                    await waitForRequest(
                        scope,
                        interceptor,
                        3000,
                        'Config request timed out'
                    )
                })

                afterAll(async () => {
                    await testClient.close()
                })

                forEachVariableType((type) => {
                    const { key, defaultValue, variableType } = expectedVariablesByType[type]

                    it('should return default value if client is uninitialized',  async () => {
                        const variableResponse = await testClient.callVariable(
                            { user_id: 'user1', customData: { 'should-bucket': true } },
                            key,
                            defaultValue
                        )
                        const variable = await variableResponse.json()
                        expectDefaultValue(key, variable, defaultValue, variableType)
                    })
                })
            })
        })

        const expectEventBody = (
            body: Record<string, unknown>,
            variableId: string,
            eventType: string,
            value?: number
        ) => {
            expect(body).toMatchObject({
                batch: [{
                    user: expect.objectContaining({
                        platform: expectedPlatform,
                        sdkType: 'server',
                    }),
                    events: [
                        expect.objectContaining({
                            type: eventType,
                            target: variableId,
                            value: value !== undefined ? value : 1,
                        })
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
