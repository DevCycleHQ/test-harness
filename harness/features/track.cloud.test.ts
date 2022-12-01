import { getConnectionStringForProxy, forEachSDK, describeIf, createClient, createUser } from '../helpers'
import { Capabilities, SDKCapabilities } from '../types'
import { v4 as uuidv4 } from 'uuid'
import { getServerScope } from '../mockServer'
import nock from 'nock'

jest.setTimeout(1000000)

const scope = getServerScope()

describe('Track Tests - Cloud', () => {
    forEachSDK((name) => {
        let url: string
        const capabilities: string[] = SDKCapabilities[name]
        const clientId: string = uuidv4()
        const mockServerUrl = `http://host.docker.internal:${global.__MOCK_SERVER_PORT__}`

        beforeAll(async () => {
            url = getConnectionStringForProxy(name)
            await createClient(url, clientId, 'dvc_server_test_token', {
                enableCloudBucketing: true,
                baseURLOverride: `${mockServerUrl}/client/${clientId}`
            })
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
                const response = await createUser(url, { user_id: 'user1' })
                await response.json()
                const userId = response.headers.get('location')

                const trackResponse = await callTrack(clientId, url, userId, { type: 'variableEvaluated', target: 1 })

                scope
                    .post((uri) => uri.includes('/v1/track'))
                    .matchHeader('Content-Type', 'application/json')
                    .reply(200, {})

                await wait(1000)
                await trackResponse.json()

                expect(scope.isDone()).toBeTruthy()
            })

            it('should retry events API on failed request', async () => {
                const response = await createUser(url, { user_id: 'user1' })
                await response.json()
                const userId = response.headers.get('location')

                const trackResponse = await callTrack(clientId, url, userId, { type: 'variableEvaluated', target: 123 })

                scope
                    .post((uri) => uri.includes('/v1/track'))
                    .matchHeader('Content-Type', 'application/json')
                    .reply(400, {})

                scope
                    .post((uri) => uri.includes('/v1/track'))
                    .matchHeader('Content-Type', 'application/json')
                    .reply(200, {})

                await wait(1000)
                await trackResponse.json()

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
