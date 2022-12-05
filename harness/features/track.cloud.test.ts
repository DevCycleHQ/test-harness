import { getConnectionStringForProxy, forEachSDK, describeIf, createClient, createUser } from '../helpers'
import { Capabilities, SDKCapabilities, latestNodeJsSdkVersion } from '../types'
import { v4 as uuidv4 } from 'uuid'
import { getServerScope } from '../mockServer'
import nock from 'nock'

jest.setTimeout(1000000)

const scope = getServerScope()

describe('Track Tests - Cloud', () => {
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
            await createClient(url, clientId, 'dvc_server_test_token', {
                enableCloudBucketing: true,
                baseURLOverride: `${mockServerUrl}/client/${clientId}`
            })
        })

        afterEach(() => {
            jest.clearAllMocks()
        })

        describeIf(capabilities.includes(Capabilities.cloud))(name, () => {
            it('should complain if event type not set', async () => {
                const response = await createUser(url, { user_id: 'user1' })
                await response.json()
                const userId = response.headers.get('location')

                const trackResponse = await callTrack(clientId, url, userId, { target: 1 })
                const res = await trackResponse.json()
                expect(res.exception).toBe('Invalid Event')
            })

            it('should call events API to track event', async () => {
                const eventType = 'pageNavigated'
                const variableId = 'string-var'
                const value = 1

                const response = await createUser(url, { user_id: validUserId })
                await response.json()
                const userId = response.headers.get('location')

                const trackResponse = await callTrack(clientId, url, userId,
                    { type: eventType, target: variableId, value })

                scope
                    .post(`/client/${clientId}/v1/track`)
                    .matchHeader('Content-Type', 'application/json')
                    .reply((uri, body) => {
                        mockEvents(body)
                        return [201, { success: true }]
                    })

                await wait(1000)
                await trackResponse.json()

                expect(mockEvents).toHaveBeenCalledTimes(1)
                const track = mockEvents.mock.calls[0][0]
                expect(track).toBeDefined()

                expect(track.user.platform).toBe('NodeJS')
                expect(track.user.sdkType).toBe('server')
                // expect(track.user.sdkVersion).toBe(latestNodeJsSdkVersion)
                expect(track.user.user_id).toBe(validUserId)

                expect(track.events.length).toBe(1)

                expect(track.events[0].type).toBe(eventType)
                expect(track.events[0].target).toBe(variableId)
                expect(track.events[0].value).toBe(value)
            })

            it('should retry events API on failed request', async () => {

                const eventType = 'buttonClicked'
                const variableId = 'json-var'
                const value = 1

                const response = await createUser(url, { user_id: validUserId })
                await response.json()
                const userId = response.headers.get('location')

                const trackResponse = await callTrack(clientId, url, userId,
                    { type: eventType, target: variableId, value })

                scope
                    .post(`/client/${clientId}/v1/track`)
                    .matchHeader('Content-Type', 'application/json')
                    .reply(519, {})

                scope
                    .post(`/client/${clientId}/v1/track`)
                    .matchHeader('Content-Type', 'application/json')
                    .reply((uri, body) => {
                        mockEvents(body)
                        return [201, { success: true }]
                    })

                await wait(1000)
                await trackResponse.json()

                expect(mockEvents).toHaveBeenCalledTimes(1)
                const track = mockEvents.mock.calls[0][0]
                expect(track).toBeDefined()

                expect(track.user.platform).toBe('NodeJS')
                expect(track.user.sdkType).toBe('server')
                // expect(track.user.sdkVersion).toBe(latestNodeJsSdkVersion)
                expect(track.user.user_id).toBe(validUserId)

                expect(track.events.length).toBe(1)

                expect(track.events[0].type).toBe(eventType)
                expect(track.events[0].target).toBe(variableId)
                expect(track.events[0].value).toBe(value)

                expect(scope.isDone()).toBeTruthy()
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
