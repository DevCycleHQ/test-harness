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
import { getServerScope } from '../nock'
import { config } from '../mockData/index'
import nock from 'nock'

jest.setTimeout(1000000)

const scope = getServerScope()

describe('Track Tests - Local', () => {
    const validUserId = 'user1'
    forEachSDK((name) => {
        let url: string
        const capabilities: string[] = SDKCapabilities[name]
        const clientId: string = uuidv4()
        const mockServerUrl
            = `http://${process.env.DOCKER_HOST_IP ?? 'host.docker.internal'}:${global.__MOCK_SERVER_PORT__}`

        beforeAll(async () => {
            url = getConnectionStringForProxy(name)

            const sdkKey = `dvc_server_${clientId}`

            scope
                .get(`/client/${clientId}/config/v1/server/${sdkKey}.json`)
                .reply(200, config)

            scope.post(`/client/${clientId}`).reply((uri, body) => {
                if (typeof body === 'object'
                    && body.message.includes('onClientInitialized was invoked'))
                    return [200]
            })

            await createClient(url, clientId, sdkKey, {
                baseURLOverride: `${mockServerUrl}/client/${clientId}`,
                eventFlushIntervalMS: 1000, logLevel: 'debug', configPollingIntervalMS: 1000 * 60
            })
            await callOnClientInitialized(clientId, url, `${mockServerUrl}/client/${clientId}`)

        })

        describeIf(capabilities.includes(Capabilities.local))(name, () => {
            describe('Expect no events sent', () => {
                it('should not send an event if the event type not set', async () => {
                    let eventBody = {}

                    const response = await createUser(url, { user_id: validUserId })
                    await response.json()
                    const userId = response.headers.get('location')

                    const trackResponse = await callTrack(clientId, url, userId, {})

                    nock.emitter.on('no match', (req) => {
                        req.body = eventBody
                    })

                    await wait(2000) // wait for event flush

                    const res = await trackResponse.json()
                    expect(res.exception).toBe('Missing parameter: type') // works for GH actions sometimes
                    // expect(res.entityType).toBe('Void') // workaround to get tests to pass locally
                    expect(eventBody).toEqual({})
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

                    let startDate = Date.now()
                    scope
                        .post(`/client/${clientId}/v1/events/batch`)
                        .matchHeader('Content-Type', 'application/json')
                        .times(10)
                        .reply((uri, body) => {
                            timestamps.push(Date.now() - startDate)
                            startDate = Date.now()
                            count++
                            return [519]
                        })

                    let finalTime = 0
                    scope.post(`/client/${clientId}/v1/events/batch`).reply((uri, body) => {
                        eventBody = body
                        console.log('time finally' + (Date.now() - startDate))
                        finalTime = Date.now() - startDate
                        return [201]
                    })

                    await callTrack(clientId, url, userId,
                        { type: eventType, target: variableId, value: value })
                    await callTrack(clientId, url, userId,
                        { type: eventType2, target: variableId2, value: value2 })

                    await wait(1000 * 15) //wait for the flush to happen

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

                    await waitForEvent()

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
