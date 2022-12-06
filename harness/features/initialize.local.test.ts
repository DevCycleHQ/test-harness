import {
    getConnectionStringForProxy,
    forEachSDK,
    createClient,
    callOnClientInitialized,
    describeIf,
    wait
} from '../helpers'
import { v4 as uuidv4 } from 'uuid'
import { Capabilities, SDKCapabilities } from '../types'
import { getServerScope } from '../nock'

jest.setTimeout(10000)

describe('Initialize Tests - Local', () => {
    const mockServerUrl
        = `http://${process.env.DOCKER_HOST_IP ?? 'host.docker.internal'}:${global.__MOCK_SERVER_PORT__}`
    const scope = getServerScope()

    forEachSDK((name: string) => {
        const capabilities: string[] = SDKCapabilities[name]
        const sdkKey = 'server_SDK_KEY'
        let url: string

        beforeAll(async () => {
            url = getConnectionStringForProxy(name)
        })

        describeIf(capabilities.includes(Capabilities.local))(name, () => {
            it('should error when SDK key is missing', async () => {
                const clientId = uuidv4()
                const response = await createClient(url, clientId)
                const { exception } = await response.json()

                expect(exception).toEqual(
                    'Missing environment key! Call initialize with a valid environment key'
                )
            })

            it('should error when SDK key is invalid', async () => {
                const clientId = uuidv4()
                const response = await createClient(url, clientId, 'invalid key')
                const { exception } = await response.json()

                expect(exception).toEqual(
                    'Invalid environment key provided. Please call initialize with a valid server environment key'
                )
            })

            it('initializes correctly on valid data', async () => {
                const clientId = uuidv4()
                scope
                    .get(`/client/${clientId}/config/v1/server/${sdkKey}.json`)
                    .reply(200, {})

                const response = await createClient(
                    url,
                    clientId,
                    sdkKey,
                    { baseURLOverride: `${mockServerUrl}/client/${clientId}` }
                )
                const { message } = await response.json()
                await wait(500)

                expect(message).toEqual('success')
            })

            it('calls initialize promise/callback when config is successfully retrieved', async () => {
                const clientId = uuidv4()
                scope
                    .get(`/client/${clientId}/config/v1/server/${sdkKey}.json`)
                    .reply(200, {})

                const callbackSubdirectory = `/client/${clientId}/onClientInitialized`
                scope
                    .post(callbackSubdirectory, { message: `onClientInitialized was invoked on /client/${clientId}` })
                    .matchHeader('Content-Type', 'application/json')
                    .reply(204)

                await createClient(url, clientId, sdkKey, { baseURLOverride: `${mockServerUrl}/client/${clientId}` })
                await callOnClientInitialized(clientId, url, `${mockServerUrl}${callbackSubdirectory}`)
                await wait(500)
            })

            it('calls initialize promise/callback when config fails to be retrieved', async () => {
                const clientId = uuidv4()
                scope
                    .get(`/client/${clientId}/config/v1/server/${sdkKey}.json`)
                    .reply(404)

                const callbackSubdirectory = `/client/${clientId}/onClientInitialized`
                scope
                    .post(callbackSubdirectory, { message: `onClientInitialized was invoked on /client/${clientId}` })
                    .matchHeader('Content-Type', 'application/json')
                    .reply(204)

                await createClient(url, clientId, sdkKey, { baseURLOverride: `${mockServerUrl}/client/${clientId}` })
                await callOnClientInitialized(clientId, url, `${mockServerUrl}${callbackSubdirectory}`)
                await wait(500)

            })

            it('fetches config again after 3 seconds when config polling inteval is overriden', async () => {
                const clientId = uuidv4()
                scope
                    .get(`/client/${clientId}/config/v1/server/${sdkKey}.json`)
                    .times(2)
                    .reply(200, {})

                const callbackSubdirectory = `/client/${clientId}/onClientInitialized`
                scope
                    .post(callbackSubdirectory, { message: `onClientInitialized was invoked on /client/${clientId}` })
                    .matchHeader('Content-Type', 'application/json')
                    .reply(204)

                await createClient(
                    url,
                    clientId,
                    sdkKey,
                    {
                        baseURLOverride: `${mockServerUrl}/client/${clientId}`,
                        configPollingIntervalMS: 3000
                    }
                )
                await callOnClientInitialized(clientId, url, `${mockServerUrl}${callbackSubdirectory}`)
                await wait(500)

                expect(scope.pendingMocks().length).toEqual(1)

                await wait(3000)


            }, 5000)
        })
    })
})
