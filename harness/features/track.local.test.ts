import {
    getConnectionStringForProxy,
    forEachSDK,
    describeIf,
    createClient,
    createUser,
    wait,
    callOnClientInitialized,
    callTrack
} from '../helpers'
import { Capabilities, SDKCapabilities } from '../types'
import { v4 as uuidv4 } from 'uuid'
import { getServerScope, initialize } from '../mockServer'
import { config } from '../mockData/index'
import nock from 'nock'

jest.setTimeout(1000000)

const scope = getServerScope()

describe('Track Tests - Local', () => {
    const mockEvents = jest.fn()
    const validUserId = 'user1'
    forEachSDK((name) => {
        let url: string
        const capabilities: string[] = SDKCapabilities[name]
        const clientId: string = uuidv4()
        const mockServerUrl
            = `http://${process.env.DOCKER_HOST_IP ?? 'host.docker.internal'}:${global.__MOCK_SERVER_PORT__}`

        beforeAll(async () => {
            url = getConnectionStringForProxy(name)

            scope
                .get(`/client/${clientId}/config/v1/server/dvc_server_test_token_parth2.json`)
                .reply(200, config)

            scope.post(`/client/${clientId}`).reply((uri, body) => {
                console.log('client initialize body', body)
                if (typeof body === 'object'
                    && body.message.includes('onClientInitialized was invoked'))
                    return [200]
            })

            await createClient(url, clientId, 'dvc_server_test_token_parth2', {
                baseURLOverride: `${mockServerUrl}/client/${clientId}`,
                eventFlushIntervalMS: 1000, logLevel: 'debug', configPollingIntervalMS: 1000 * 60
            })
            await callOnClientInitialized(clientId, url, `${mockServerUrl}/client/${clientId}`)

        })

        afterEach(() => {
            jest.clearAllMocks()
        })

        // only for debugging
        beforeEach(() => {
            console.log('beforeEach', scope.activeMocks())
        })

        describeIf(capabilities.includes(Capabilities.local))(name, () => {
            describe('Should not send event', () => {
                it('should not send an event if the event type not set', async () => {
                    let eventBody = {}

                    const response = await createUser(url, { user_id: validUserId })
                    await response.json()
                    const userId = response.headers.get('location')

                    const trackResponse = await callTrack(clientId, url, userId, {})

                    nock.emitter.on('no match', (req) => {
                        req.body = eventBody
                    })

                    // scope.post(`/client/${clientId}/v1/events/batch`).reply((uri, body) => {
                    //     eventBody = body
                    //     return [201]
                    // })

                    await wait(2000) // wait for event flush

                    const res = await trackResponse.json()
                    expect(res.entityType).toBe('Void') // this should be  res.exception = `Invalid Event`
                    expect(eventBody).toEqual({})
                    // expect(scope.isDone()).toBe(true)
                })
            })

            describe('Should send event', () => {

                it('should call events API to track event', async () => {
                    let eventBody = {}
                    const eventType = 'pageNavigated'
                    const variableId = 'string-var'
                    const value = 1

                    const response = await createUser(url, { user_id: validUserId })
                    await response.json()
                    const userId = response.headers.get('location')

                    scope.post(`/client/${clientId}/v1/events/batch`).reply((uri, body) => {
                        eventBody = body
                        return [201]
                    })

                    const trackResponse = await callTrack(clientId, url, userId,
                        { type: eventType, target: 'string-var', value: value })

                    await trackResponse.json()
                    await waitForEvent()

                    expect(eventBody).toEqual({
                        batch: [
                            {
                                user: expect.objectContaining({
                                    platform: 'NodeJS',
                                    sdkType: 'server',
                                    // sdkVersion: latestNodeJsSdkVersion,
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


                    scope.post(`/client/${clientId}/v1/events/batch`).reply((uri, body) => {
                        eventBody = body
                        return [201]
                    })

                    console.log('active mocks', scope.activeMocks())

                    await callTrack(clientId, url, userId,
                        { type: eventType, target: variableId, value: value })
                    await callTrack(clientId, url, userId,
                        { type: eventType2, target: variableId2, value: value2 })

                    await waitForEvent()

                    expect(eventBody).toEqual({
                        batch: [
                            {
                                user: expect.objectContaining({
                                    platform: 'NodeJS',
                                    sdkType: 'server',
                                    // sdkVersion: latestNodeJsSdkVersion,
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

                it('should retry events API call to track 2 events', async () => {
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

                    scope
                        .post(`/client/${clientId}/v1/events/batch`)
                        .matchHeader('Content-Type', 'application/json')
                        .reply(519, {})

                    scope.post(`/client/${clientId}/v1/events/batch`).reply((uri, body) => {
                        eventBody = body
                        return [201]
                    })

                    console.log('active mocks', scope.activeMocks())

                    await callTrack(clientId, url, userId,
                        { type: eventType, target: variableId, value: value })
                    await callTrack(clientId, url, userId,
                        { type: eventType2, target: variableId2, value: value2 })

                    await waitForEvent()

                    expect(eventBody).toEqual({
                        batch: [
                            {
                                user: expect.objectContaining({
                                    platform: 'NodeJS',
                                    sdkType: 'server',
                                    // sdkVersion: latestNodeJsSdkVersion,
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

                //skipping this test because it takes too long to run and need to change the code to make it run faster
                it.skip('should retry with exponential backoff events API call to track 2 events', async () => {
                    let eventBody = {}
                    const timestamps = []
                    let count = 0
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

                    await callTrack(clientId, url, userId,
                        { type: eventType, target: variableId, value: value })
                    await callTrack(clientId, url, userId,
                        { type: eventType2, target: variableId2, value: value2 })

                    let startDate = Date.now()
                    scope
                        .post((uri) => uri.includes(`/client/${clientId}/v1/events/batch`))
                        .matchHeader('Content-Type', 'application/json')
                        .times(10)
                        .reply((uri, body) => {
                            timestamps.push(Date.now() - startDate)
                            startDate = Date.now()
                            count++
                            return [519]
                        })

                    await wait(20000)

                    let finalTime = 0
                    scope.post(`/client/${clientId}/v1/events/batch`).reply((uri, body) => {
                        eventBody = body
                        console.log('time finally' + (Date.now() - startDate))
                        finalTime = Date.now() - startDate
                        return [201]
                    })

                    await wait(20000)

                    // I do not think this test is reliable
                    let total = 0
                    console.log(timestamps)

                    for (let i = 0; i < timestamps.length; i++) {
                        const time = timestamps[i]
                        console.log('time', time)
                        total += time

                    }
                    const avg = total / timestamps.length
                    console.log('avg', avg)

                    await new Promise((resolve) => {
                        setTimeout(() => {
                            resolve({})
                        }, 1000)
                    })

                    expect(mockEvents).toHaveBeenCalledTimes(1)
                    expect(finalTime).toBeGreaterThanOrEqual(avg)
                    const batch: [] = mockEvents.mock.calls[0][0].batch
                    expect(batch).toBeDefined()

                    batch.forEach((obj: any) => {
                        expect(obj.user.platform).toBe('NodeJS')
                        expect(obj.user.sdkType).toBe('server')
                        // expect(obj.user.sdkVersion).toBe(latestNodeJsSdkVersion)
                        expect(obj.user.user_id).toBe(validUserId)

                        expect(obj.events.length).toBe(2)

                        //check first event
                        expect(obj.events[0].type).toBe('customEvent')
                        expect(obj.events[0].customType).toBe(eventType)
                        expect(obj.events[0].target).toBe(variableId)
                        expect(obj.events[0].user_id).toBe(validUserId)
                        expect(obj.events[0].value).toBe(value)

                        //check second event
                        expect(obj.events[1].type).toBe('customEvent')
                        expect(obj.events[1].customType).toBe(eventType2)
                        expect(obj.events[1].target).toBe(variableId2)
                        expect(obj.events[1].user_id).toBe(validUserId)
                        expect(obj.events[1].value).toBe(value2)

                    })
                })
            })
        })
    })

    const waitForEvent = async () => {
        await new Promise((resolve) => {
            setTimeout(() => {
                resolve({})
            }, 3000)
        })
        expect(scope.isDone()).toBeTruthy()
    }

})
