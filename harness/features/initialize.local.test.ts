import {
    getConnectionStringForProxy,
    forEachSDK,
    describeIf,
    wait,
    TestClient
} from '../helpers'
import { Capabilities, SDKCapabilities } from '../types'
import { getServerScope } from '../nock'

jest.setTimeout(10000)

describe('Initialize Tests - Local', () => {
    const scope = getServerScope()

    forEachSDK((name: string) => {
        const capabilities: string[] = SDKCapabilities[name]
        let url: string

        beforeAll(async () => {
            url = getConnectionStringForProxy(name)
        })

        describeIf(capabilities.includes(Capabilities.local))(name, () => {
            it('should error when SDK key is missing', async () => {
                const testClient = new TestClient(name)
                const response = await testClient.createClient({}, null)
                const { exception } = await response.json()

                expect(exception).toEqual(
                    'Missing environment key! Call initialize with a valid environment key'
                )
            })

            it('should error when SDK key is invalid', async () => {
                const testClient = new TestClient(name)
                const response = await testClient.createClient({}, 'invalid key')
                const { exception } = await response.json()

                expect(exception).toEqual(
                    'Invalid environment key provided. Please call initialize with a valid server environment key'
                )
            })

            it('initializes correctly on valid data', async () => {
                const testClient = new TestClient(name)
                scope
                    .get(`/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`)
                    .reply(200, {})

                const response = await testClient.createClient()
                const { message } = await response.json()
                await wait(500)

                expect(message).toEqual('success')
            })

            it('calls initialize promise/callback when config is successfully retrieved', async () => {
                const testClient = new TestClient(name)
                scope
                    .get(`/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`)
                    .reply(200, {})

                await testClient.createClient()
                await testClient.callOnClientInitialized()
                await wait(500)
            })

            it('calls initialize promise/callback when config fails to be retrieved', async () => {
                const testClient = new TestClient(name)

                scope
                    .get(`/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`)
                    .reply(404)

                await testClient.createClient()
                await testClient.callOnClientInitialized()
                await wait(500)

            })

            it('fetches config again after 3 seconds when config polling inteval is overriden', async () => {
                const testClient = new TestClient(name)
                scope
                    .get(`/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`)
                    .times(2)
                    .reply(200, {})

                await testClient.createClient(
                    {
                        configPollingIntervalMS: 3000
                    }
                )
                await testClient.callOnClientInitialized()
                await wait(500)

                expect(scope.pendingMocks().length).toEqual(1)

                await wait(3000)
            }, 5000)
        })
    })
})
