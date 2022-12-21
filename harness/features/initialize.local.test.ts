import {
    forEachSDK,
    describeIf,
    wait,
    LocalTestClient, describeCapability
} from '../helpers'
import { Capabilities, SDKCapabilities } from '../types'
import { config } from '../mockData'
import { getServerScope } from '../nock'

jest.setTimeout(10000)

describe('Initialize Tests - Local', () => {
    const scope = getServerScope()

    forEachSDK((name: string) => {
        describeCapability(name, Capabilities.local)(name, () => {
            it('should error when SDK key is missing', async () => {
                const testClient = new LocalTestClient(name)
                const response = await testClient.createClient({}, null, true)
                const { exception } = await response.json()

                expect(exception).toEqual(
                    'Missing environment key! Call initialize with a valid environment key'
                )
                await testClient.close()
            })

            it('should error when SDK key is invalid', async () => {
                const testClient = new LocalTestClient(name)
                const response = await testClient.createClient({}, 'invalid key', true)
                const { exception } = await response.json()

                expect(exception).toEqual(
                    'Invalid environment key provided. Please call initialize with a valid server environment key'
                )
                await testClient.close()
            })

            it('initializes correctly on valid data', async () => {
                const testClient = new LocalTestClient(name)
                scope
                    .get(`/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`)
                    .reply(200, config)

                const response = await testClient.createClient()
                const { message } = await response.json()
                await testClient.callOnClientInitialized()

                expect(message).toEqual('success')
                await testClient.close()
            })

            it('calls initialize promise/callback when config is successfully retrieved', async () => {
                const testClient = new LocalTestClient(name)
                scope
                    .get(`/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`)
                    .reply(200, config)

                await testClient.createClient()
                await testClient.callOnClientInitialized()
                await testClient.close()
            })

            it('calls initialize promise/callback when config fails to be retrieved', async () => {
                const testClient = new LocalTestClient(name)

                scope
                    .get(`/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`)
                    .reply(404)

                await testClient.createClient()
                await testClient.callOnClientInitialized()
                await testClient.close()
            })

            it('fetches config again after 3 seconds when config polling inteval is overriden', async () => {
                const testClient = new LocalTestClient(name)
                scope
                    .get(`/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`)
                    .times(2)
                    .reply(200, config)

                await testClient.createClient(
                    {
                        configPollingIntervalMS: 3000
                    }
                )
                await testClient.callOnClientInitialized()

                expect(scope.pendingMocks().length).toEqual(1)

                await wait(3100)
                await testClient.close()
            }, 5000)
        })
    })
})
