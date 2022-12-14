import {
    getConnectionStringForProxy,
    forEachSDK,
    describeIf,
    createUser,
    wait,
    waitForRequest,
    LocalTestClient
} from '../helpers'
import { Capabilities, SDKCapabilities } from '../types'
import { getServerScope } from '../nock'
import { config } from '../mockData'

jest.setTimeout(15000)

const scope = getServerScope()

describe('Track Tests - Local', () => {
    const validUserId = 'user1'
    forEachSDK((name) => {
        let url: string
        const capabilities: string[] = SDKCapabilities[name]
        const eventFlushIntervalMS = 1000

        describeIf(capabilities.includes(Capabilities.local))(name, () => {

            const client = new LocalTestClient(name)

            beforeAll(async () => {
                url = getConnectionStringForProxy(name)

                scope
                    .get(`/client/${client.clientId}/config/v1/server/${client.sdkKey}.json`)
                    .reply(200, config)

                await client.createClient({
                    eventFlushIntervalMS: eventFlushIntervalMS,
                    logLevel: 'debug',
                    configPollingIntervalMS: 1000 * 60
                })

                await client.callOnClientInitialized()
            })

            afterAll(async () => {
                await client.close()
            })

            describe('Expect no events sent', () => {
                it('should not send an event if the event type not set', async () => {
                    const response = await createUser(url, { user_id: validUserId })
                    await response.json()
                    const userId = response.headers.get('location')

                    const trackResponse = await client.callTrack(userId, {}, true)

                    const res = await trackResponse.json()
                    expect(res.exception).toBe('Missing parameter: type') // works for GH actions sometimes

                    // wait for 2 event flush to ensure no flush happens, if it fails it will get caught by
                    // the global assertNoUnmatchedRequests and fail this testcase
                    await wait(eventFlushIntervalMS * 2)
                })
            })

            describe('Expect events sent', () => {
                it('should call events API to track event', async () => {
                    let eventBody = {}
                    const eventType = 'pageNavigated'
                    const variableId = 'string-var'
                    const value = 1

                    const response = await createUser(url, { user_id: validUserId })
                    await response.json()
                    const userId = response.headers.get('location')

                    const interceptor = scope.post(`/client/${client.clientId}/v1/events/batch`)
                    interceptor.reply((uri, body) => {
                        eventBody = body
                        return [201]
                    })

                    const trackResponse = await client.callTrack(userId,
                        { type: eventType, target: 'string-var', value: value })

                    await trackResponse.json()
                    await waitForRequest(scope, interceptor, eventFlushIntervalMS * 2, 'Event callback timed out')

                    expect(eventBody).toEqual({
                        batch: [
                            {
                                user: expect.objectContaining({
                                    platform: 'NodeJS',
                                    sdkType: 'server',
                                    user_id: validUserId,
                                }),
                                events: [
                                    expect.objectContaining({
                                        type: 'customEvent',
                                        customType: eventType,
                                        target: variableId,
                                        value: value,
                                        user_id: validUserId,
                                    })
                                ]
                            },
                        ],
                    })
                })

                it('should call events API to track 2 events', async () => {
                    let eventBody = {}
                    // const eventType = 'buttonClicked'
                    const eventType = 'buttonClicked'
                    const variableId = 'string-var'
                    const value = 2

                    // const eventType2 = 'textChanged'
                    const eventType2 = 'textChanged'
                    const variableId2 = 'json-var'
                    const value2 = 3

                    const response = await createUser(url, { user_id: validUserId })
                    await response.json()
                    const userId = response.headers.get('location')


                    const interceptor = scope.post(`/client/${client.clientId}/v1/events/batch`)
                    interceptor.reply((uri, body) => {
                        eventBody = body
                        return [201]
                    })

                    await client.callTrack(userId,
                        { type: eventType, target: variableId, value: value })
                    await client.callTrack(userId,
                        { type: eventType2, target: variableId2, value: value2 })

                    await waitForRequest(scope, interceptor, eventFlushIntervalMS * 2, 'Event callback timed out')

                    expect(eventBody).toEqual({
                        batch: [
                            {
                                user: expect.objectContaining({
                                    platform: 'NodeJS',
                                    sdkType: 'server',
                                    user_id: validUserId,
                                }),
                                events: [
                                    expect.objectContaining({
                                        type: 'customEvent',
                                        customType: eventType,
                                        target: variableId,
                                        value: value,
                                        user_id: validUserId,
                                    }),
                                    expect.objectContaining({
                                        type: 'customEvent',
                                        customType: eventType2,
                                        target: variableId2,
                                        value: value2,
                                        user_id: validUserId,
                                    })
                                ]
                            },
                        ],
                    })
                })

                it('should retry events API call to track 2 events, and check interval of events is in specified window',
                    async () => {
                        let eventBody = {}
                        const timestamps = []
                        // const eventType = 'buttonClicked'
                        const eventType = 'buttonClicked'
                        const variableId = 'string-var'
                        const value = 2

                        // const eventType2 = 'textChanged'
                        const eventType2 = 'textChanged'
                        const variableId2 = 'json-var'
                        const value2 = 3

                        const response = await createUser(url, { user_id: validUserId })
                        await response.json()
                        const userId = response.headers.get('location')

                        let startDate = Date.now()
                        scope
                            .post(`/client/${client.clientId}/v1/events/batch`)
                            .matchHeader('Content-Type', 'application/json')
                            .times(2)
                            .reply((uri, body) => {
                                timestamps.push(Date.now() - startDate)
                                startDate = Date.now()
                                return [519]
                            })

                        const interceptor = scope.post(`/client/${client.clientId}/v1/events/batch`)
                        interceptor.reply((uri, body) => {
                            eventBody = body
                            timestamps.push(Date.now() - startDate)
                            return [201]
                        })

                        await client.callTrack(userId,
                            { type: eventType, target: variableId, value: value })
                        await client.callTrack(userId,
                            { type: eventType2, target: variableId2, value: value2 })

                        await waitForRequest(scope, interceptor, eventFlushIntervalMS * 5, 'Event callback timed out')
                        //wait for a total of 2(failed) 1(passed) and 2 extra flushes (safety) to happen
                        //this is to ensure that another flush does not happen
                        //as it would be caught globally and fail this test case
                        //the extra flush would be caught by the global assertNoUnmatchedRequests

                        let total = 0
                        for (let i = 0; i < timestamps.length; i++) {
                            const time = timestamps[i]
                            total += time
                        }
                        const avg = total / timestamps.length

                        expect(eventBody).toEqual({
                            batch: [
                                {
                                    user: expect.objectContaining({
                                        platform: 'NodeJS',
                                        sdkType: 'server',
                                        user_id: validUserId,
                                    }),
                                    events: [
                                        expect.objectContaining({
                                            type: 'customEvent',
                                            customType: eventType,
                                            target: variableId,
                                            value: value,
                                            user_id: validUserId,
                                        }),
                                        expect.objectContaining({
                                            type: 'customEvent',
                                            customType: eventType2,
                                            target: variableId2,
                                            value: value2,
                                            user_id: validUserId,
                                        })
                                    ]
                                },
                            ],
                        })

                        // checking if the failed reqests were made in 10% of the defined interva;
                        expect(avg).toBeGreaterThanOrEqual(900)
                        expect(avg).toBeLessThanOrEqual(1100)
                    })
            })
        })
    })
})
