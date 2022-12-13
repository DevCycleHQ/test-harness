import {
    getConnectionStringForProxy,
    forEachSDK,
    describeIf,
    createUser,
    forEachVariableType,
    waitForRequest,
    LocalTestClient
} from '../helpers'
import { Capabilities, SDKCapabilities } from '../types'
import { getServerScope } from '../nock'
import { config } from '../mockData/index'

jest.setTimeout(10000)

const scope = getServerScope()

const expectedVariablesByType = {
    // these should match the config in mockData
    string: {
        key: 'string-var',
        defaultValue: 'default_value',
        variationOn: 'string',
    },
    number: {
        key: 'number-var',
        defaultValue: 0,
        variationOn: 1,
    },
    boolean: {
        key: 'bool-var',
        defaultValue: false,
        variationOn: true,
    },
    JSON: {
        key: 'json-var',
        defaultValue: {},
        variationOn: {
            'facts': true
        },
    }
}

describe('Variable Tests - Local', () => {
    forEachSDK((name) => {
        let url: string
        const capabilities: string[] = SDKCapabilities[name]
        const variationOnUser = { location: '', user_id: 'user1' }
        const noVariationUser = { location: '', user_id: 'user3' }
        const invalidUser = { location: '', user_id: '' }

        beforeAll(async () => {
            url = getConnectionStringForProxy(name)

            // create users
            variationOnUser.location = (
                await createUser(url, { user_id: variationOnUser.user_id, customData: { 'should-bucket': true } })
            ).headers.get('location')

            noVariationUser.location = (
                await createUser(url, { user_id: noVariationUser.user_id })
            ).headers.get('location')

            invalidUser.location = (
                await createUser(url, { name: 'invalid' })
            ).headers.get('location')

        })

        describeIf(capabilities.includes(Capabilities.local))(name, () => {
            const testClient = new LocalTestClient(name)
            let eventsUrl: string

            describe('initialized client', () => {
                beforeAll(async () => {
                    // create client
                    await testClient.createClient({
                        configPollingIntervalMS: 100000,
                        eventFlushIntervalMS: 500,
                    })
                    // mock endpoints
                    scope
                        .get(`/${testClient.clientLocation}/config/v1/server/${testClient.sdkKey}.json`)
                        .reply(200, config)

                    await testClient.callOnClientInitialized()

                    eventsUrl = `/${testClient.clientLocation}/v1/events/batch`
                })

                it('should throw exception if user is invalid',  async () => {
                    const variableResponse =
                        await testClient.callVariable(invalidUser.location, 'string-var', 'string default')
                    const variable = await variableResponse.json()

                    expect(variable.exception).toBe('Must have a user_id set on the user')
                })

                forEachVariableType((type) => {
                    const { key, defaultValue, variationOn } = expectedVariablesByType[type]

                    it('should return variable if mock server returns object matching default type',  async () => {
                        let eventBody = {}
                        const interceptor = scope.post(eventsUrl)
                        interceptor.reply((uri, body) => {
                            eventBody = body
                            return [201]
                        })

                        const variableResponse = await testClient.callVariable(
                            variationOnUser.location,
                            key,
                            defaultValue
                        )
                        const variable = await variableResponse.json()
                        expect(variable).toEqual(expect.objectContaining({
                            entityType: 'Variable',
                            data: expect.objectContaining({
                                isDefaulted: false,
                                defaultValue: defaultValue,
                                value: variationOn
                            })
                        }))

                        await waitForRequest(scope, interceptor, 600, 'Event callback timed out')
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
                                variationOnUser.location,
                                key,
                                wrongTypeDefault
                            )
                        const variable = await variableResponse.json()

                        expectDefaultValue(key, variable, wrongTypeDefault)
                        await waitForRequest(scope, interceptor, 600, 'Event callback timed out')
                        expectEventBody(eventBody, key, 'aggVariableEvaluated')
                    })

                    it('should return default value if user is not bucketed into variable',  async () => {
                        let eventBody = {}
                        const interceptor = scope.post(eventsUrl)
                        interceptor.reply((uri, body) => {
                            eventBody = body
                            return [201]
                        })
                        const variableResponse = await testClient.callVariable(
                            noVariationUser.location,
                            key,
                            defaultValue
                        )
                        const variable = await variableResponse.json()

                        expectDefaultValue(key, variable, defaultValue)
                        await waitForRequest(scope, interceptor, 600, 'Event callback timed out')
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
                            variationOnUser.location,
                            'nonexistent',
                            defaultValue
                        )
                        const variable = await variableResponse.json()

                        expectDefaultValue('nonexistent', variable, defaultValue)
                        await waitForRequest(scope, interceptor, 600, 'Event callback timed out')
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
                            variationOnUser.location,
                            'nonexistent',
                            defaultValue
                        )
                        await testClient.callVariable(
                            variationOnUser.location,
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
                            variationOnUser.location,
                            key,
                            defaultValue
                        )
                        await testClient.callVariable(
                            variationOnUser.location,
                            key,
                            defaultValue
                        )

                        await waitForRequest(scope, interceptor, 600, 'Event callback timed out')
                        expectEventBody(eventBody, key, 'aggVariableEvaluated', 2)
                    })
                })
            })
        })

        describe('uninitialized client', () => {
            const testClient = new LocalTestClient(name)

            beforeAll(async () => {
                await testClient.createClient()
                const configRequestUrl = `/${testClient.clientLocation}/config/v1/server/${testClient.sdkKey}.json`
                const interceptor = scope
                    .get(configRequestUrl)

                interceptor.reply(404)

                await waitForRequest(
                    scope,
                    interceptor,
                    3000,
                    'Config request timed out'
                )
            })

            forEachVariableType((type) => {
                const { key, defaultValue } = expectedVariablesByType[type]

                it('should return default value if client is uninitialized',  async () => {
                    const variableResponse = await testClient.callVariable(
                        variationOnUser.location, key, defaultValue
                    )
                    const variable = await variableResponse.json()
                    expectDefaultValue(key, variable, defaultValue)
                })

                it.failing('should throw exception if user is invalid',  async () => {
                    const variableResponse =
                        await testClient.callVariable(invalidUser.location, key, defaultValue)
                    const variable = await variableResponse.json()

                    expect(variable.exception).toBe('Must have a user_id set on the user')
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
                    platform: 'NodeJS',
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

    type ValueTypes = string | boolean | number | JSON

    type VariableResponse = {
        entityType: string,
        data: {
            value: ValueTypes,
            isDefaulted: boolean,
            defaultValue: ValueTypes
        }
    }

    const expectDefaultValue = (key: string, variable: VariableResponse, defaultValue: ValueTypes) => {
        expect(variable).toEqual({
            entityType: 'Variable',
            data: {
                isDefaulted: true,
                defaultValue: defaultValue,
                value: defaultValue,
                key: key
            },
            logs: []
        })
    }
})
