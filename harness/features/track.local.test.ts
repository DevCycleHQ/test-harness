import { getConnectionStringForProxy, forEachSDK, describeIf, createClient, createUser } from '../helpers'
import { Capabilities, SDKCapabilities } from '../types'
import { v4 as uuidv4 } from 'uuid'
import { getServerScope } from '../mockServer'
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
        const mockServerUrl = `http://host.docker.internal:${global.__MOCK_SERVER_PORT__}`

        beforeAll(async () => {
            url = getConnectionStringForProxy(name)
            await createClient(url, clientId, 'dvc_server_test_token', {
                baseURLOverride: `${mockServerUrl}/client/${clientId}`,
                eventFlushIntervalMS: 1000,
            })

            scope
                .get(`/client/${clientId}/config/v1/server/dvc_server_test_token.json`)
                .reply(200, config)

            scope.post(`/client/${clientId}`).reply((uri, body) => {
                if (typeof body === 'object'
                    && body.message.includes('onClientInitialized was invoked'))
                    return [200]
            })

            // scope.persist().post(`/client/${clientId}/v1/events/batch`).reply(function (uri, body: any) {
            //     mockEvents(body)
            //     return [201]
            // })
        })

        afterEach(() => {
            jest.clearAllMocks()
            nock.cleanAll()
        })

        beforeEach(() => {
            console.log('scope', scope.activeMocks())

        })

        describeIf(capabilities.includes(Capabilities.cloud))(name, () => {
            it('should not send an event if the event type not set', async () => {

                const response = await createUser(url, { user_id: validUserId })
                await response.json()
                const userId = response.headers.get('location')

                const trackResponse = await callTrack(clientId, url, userId, {})

                scope.post(`/client/${clientId}/v1/events/batch`).reply((uri, body) => {
                    mockEvents(body)
                    return [201]
                })

                await wait(2000)

                await new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({})
                    }, 1000)
                })
                expect(mockEvents).toHaveBeenCalledTimes(0)

                const res = await trackResponse.json()
                console.log('res', res)
                // console.log('scope', scope.activeMocks())

                // expect(res.exception).toBe('Invalid Event')
                // console.log('scope', scope.activeMocks())
                // expect(scope.isDone()).toBeTruthy()

            })

            it('should call events API to track event', async () => {
                const eventType = 'pageNavigated'
                const variableId = 'string-var'
                const value = 1

                const response = await createUser(url, { user_id: validUserId })
                await response.json()
                const userId = response.headers.get('location')

                const trackResponse = await callTrack(clientId, url, userId,
                    { type: eventType, target: 'string-var', value: value })


                scope.post(`/client/${clientId}/v1/events/batch`).reply((uri, body) => {
                    mockEvents(body)
                    return [201]
                })

                await wait(2500)
                await trackResponse.json()

                console.log('mockEvents.mock.calls for 1', mockEvents.mock.calls)
                expect(mockEvents).toHaveBeenCalledTimes(1)
                const batch: [] = mockEvents.mock.calls[0][0].batch
                expect(batch).toBeDefined()
                batch.forEach((obj: any) => {
                    console.log('obj', obj)
                    expect(obj.user.platform).toBe('NodeJS')
                    expect(obj.user.sdkType).toBe('server')
                    expect(obj.user.sdkVersion).toBe('1.4.22')
                    expect(obj.user.user_id).toBe(validUserId)

                    expect(obj.events.length).toBe(1)

                    expect(obj.events[0].type).toBe('customEvent')
                    expect(obj.events[0].customType).toBe(eventType)
                    expect(obj.events[0].target).toBe(variableId)
                    expect(obj.events[0].value).toBe(value)
                    expect(obj.events[0].user_id).toBe(validUserId)
                })
            })

            it('should call events API to track 2 events', async () => {
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

                scope.post(`/client/${clientId}/v1/events/batch`).reply((uri, body) => {
                    mockEvents(body)
                    return [201]
                })

                await wait(2500)

                await new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({})
                    }, 1000)
                })


                expect(mockEvents).toHaveBeenCalledTimes(1)

                const batch: [] = mockEvents.mock.calls[0][0].batch
                expect(batch).toBeDefined()

                batch.forEach((obj: any) => {
                    expect(obj.user.platform).toBe('NodeJS')
                    expect(obj.user.sdkType).toBe('server')
                    expect(obj.user.sdkVersion).toBe('1.4.22')
                    expect(obj.user.user_id).toBe(validUserId)

                    expect(obj.events.length).toBe(2)

                    console.log('obj', obj)

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

            it('should retry events API call to track 2 events', async () => {
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

                scope
                    .post((uri) => uri.includes(`/client/${clientId}/v1/events/batch`))
                    .matchHeader('Content-Type', 'application/json')
                    .reply(400, {})

                await wait(2500)

                scope.post(`/client/${clientId}/v1/events/batch`).reply((uri, body) => {
                    mockEvents(body)
                    return [201]
                })

                await wait(2500)

                await new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({})
                    }, 1000)
                })

                expect(mockEvents).toHaveBeenCalledTimes(1)

                const batch: [] = mockEvents.mock.calls[0][0].batch
                expect(batch).toBeDefined()

                batch.forEach((obj: any) => {
                    expect(obj.user.platform).toBe('NodeJS')
                    expect(obj.user.sdkType).toBe('server')
                    expect(obj.user.sdkVersion).toBe('1.4.22')
                    expect(obj.user.user_id).toBe(validUserId)

                    expect(obj.events.length).toBe(2)

                    console.log('obj', obj)

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

            it('should retry with exponential backoff events API call to track 2 events', async () => {
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
                        return [400]
                    })

                await wait(20000)

                let total = 0

                for (let i = 0; i < timestamps.length; i++) {
                    const time = timestamps[i]
                    console.log('time', time)
                    total += time

                }
                const avg = total / timestamps.length
                console.log('avg', avg)

                scope.post(`/client/${clientId}/v1/events/batch`).reply((uri, body) => {
                    mockEvents(body)
                    console.log('time finally' + (Date.now() - startDate))
                    startDate = Date.now()
                    return [201]
                })

                await wait(20000)

                await new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({})
                    }, 1000)
                })

                expect(mockEvents).toHaveBeenCalledTimes(1)

                const batch: [] = mockEvents.mock.calls[0][0].batch
                expect(batch).toBeDefined()

                batch.forEach((obj: any) => {
                    expect(obj.user.platform).toBe('NodeJS')
                    expect(obj.user.sdkType).toBe('server')
                    expect(obj.user.sdkVersion).toBe('1.4.22')
                    expect(obj.user.user_id).toBe(validUserId)

                    expect(obj.events.length).toBe(2)

                    console.log('obj', obj)

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

    const callTrack = async (clientId: string, url: string, userLocation: string, event: any) => {
        return await fetch(`${url}/client/${clientId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                command: 'track',
                isAsyc: true,
                params: [
                    { location: `${userLocation}` },
                    { value: event }
                ],
            })
        })
    }

    const wait = (ms: number) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({})
            }, ms)
        })
    }

})
