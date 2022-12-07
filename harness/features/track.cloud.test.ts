import { getConnectionStringForProxy, forEachSDK, describeIf, createClient, createUser, callTrack } from '../helpers'
import { Capabilities, SDKCapabilities } from '../types'
import { v4 as uuidv4 } from 'uuid'
import { getServerScope } from '../nock'
import nock from 'nock'

jest.setTimeout(1000000)

const scope = getServerScope()

describe('Track Tests - Cloud', () => {
    const validUserId = 'user1'
    forEachSDK((name) => {
        let url: string
        const capabilities: string[] = SDKCapabilities[name]
        const clientId: string = uuidv4()
        const mockServerUrl
            = `http://${process.env.DOCKER_HOST_IP ?? 'host.docker.internal'}:${global.__MOCK_SERVER_PORT__}`

        beforeAll(async () => {
            const sdkKey = `dvc_server_${clientId}`

            url = getConnectionStringForProxy(name)
            await createClient(url, clientId, sdkKey, {
                enableCloudBucketing: true,
                baseURLOverride: `${mockServerUrl}/client/${clientId}`
            })
        })

        afterEach(() => {
            jest.clearAllMocks()
        })

        describeIf(capabilities.includes(Capabilities.cloud))(name, () => {
            it('should complain if event type not set', async () => {
                const response = await createUser(url, { user_id: validUserId })
                await response.json()
                const userId = response.headers.get('location')

                const trackResponse = await callTrack(clientId, url, userId, { target: 1 })
                const res = await trackResponse.json()
                expect(res.exception).toBe('Invalid Event')
            })

            it('should call events API to track event', async () => {
                let eventBody = {}
                const eventType = 'pageNavigated'
                const variableId = 'string-var'
                const value = 1

                const response = await createUser(url, { user_id: validUserId })
                await response.json()
                const userId = response.headers.get('location')

                scope
                    .post(`/client/${clientId}/v1/track`)
                    .matchHeader('Content-Type', 'application/json')
                    .reply((uri, body) => {
                        eventBody = body
                        return [201, { success: true }]
                    })

                await callTrack(clientId, url, userId,
                    { type: eventType, target: variableId, value })

                await waitForEvent()

                expectEventBody(eventBody, variableId, eventType, value)
            })

            it('should retry events API on failed request', async () => {
                let eventBody = {}

                const eventType = 'buttonClicked'
                const variableId = 'json-var'
                const value = 1

                const response = await createUser(url, { user_id: validUserId })
                await response.json()
                const userId = response.headers.get('location')

                scope
                    .post(`/client/${clientId}/v1/track`)
                    .matchHeader('Content-Type', 'application/json')
                    .reply(519, {})

                scope
                    .post(`/client/${clientId}/v1/track`)
                    .matchHeader('Content-Type', 'application/json')
                    .reply((uri, body) => {
                        eventBody = body
                        return [201, { success: true }]
                    })

                const trackResponse = await callTrack(clientId, url, userId,
                    { type: eventType, target: variableId, value })

                await trackResponse.json()

                await waitForEvent()

                expectEventBody(eventBody, variableId, eventType, value)
            })

        })
    })

    const waitForEvent = async () => {
        await new Promise((resolve) => {
            setTimeout(() => {
                resolve({})
            }, 550)
        })
        expect(scope.isDone()).toBeTruthy()
    }

    const expectEventBody = (
        body: Record<string, unknown>,
        variableId: string,
        eventType: string,
        value?: number,
    ) => {
        expect(body).toEqual({
            user: expect.objectContaining({
                platform: 'NodeJS',
                sdkType: 'server',
                user_id: validUserId,
            }),
            events: [
                expect.objectContaining({
                    type: eventType,
                    target: variableId,
                    value: value !== undefined ? value : 1,
                })
            ]
        })
    }
})
