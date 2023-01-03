import {
    forEachSDK,
    wait,
    LocalTestClient, describeCapability, expectErrorMessageToBe
} from '../helpers'
import { Capabilities } from '../types'
import { config } from '../mockData'
import { getServerScope } from '../nock'

jest.setTimeout(10000)

describe('Initialize Tests - Local', () => {
    const scope = getServerScope()

    forEachSDK((name: string) => {
        describeCapability(name, Capabilities.local)(name, () => {
            it('should error when SDK key is missing', async () => {
                const testClient = new LocalTestClient(name)
                const response = await testClient.createClient(true, {}, null, true)
                const { exception } = await response.json()

                expectErrorMessageToBe(
                    exception,
                    'Missing environment key! Call initialize with a valid environment key'
                )
            })

            it('should error when SDK key is invalid', async () => {
                const testClient = new LocalTestClient(name)
                const response = await testClient.createClient(true, {}, 'invalid key', true)
                const { exception } = await response.json()

                expectErrorMessageToBe(
                    exception,
                    'Invalid environment key provided. Please call initialize with a valid server environment key'
                )
            })

            it('initializes correctly on valid data', async () => {
                const testClient = new LocalTestClient(name)
                scope
                    .get(`/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`)
                    .reply(200, config)

                const response = await testClient.createClient(true, { configPollingIntervalMS: 10000 })
                const { message } = await response.json()

                expect(message).toEqual('success')
                await testClient.close()
            })

            it('calls initialize promise/callback when config is successfully retrieved', async () => {
                const testClient = new LocalTestClient(name)
                scope
                    .get(`/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`)
                    .reply(200, config)

                await testClient.createClient(true, { configPollingIntervalMS: 10000 })
                await testClient.close()
            })

            it('calls initialize promise/callback when config fails to be retrieved', async () => {
                const testClient = new LocalTestClient(name)

                scope
                    .get(`/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`)
                    .reply(404)

                await testClient.createClient(true, { configPollingIntervalMS: 10000 })
                await testClient.close()
            })

            it('fetches config again after 3 seconds when config polling interval is overriden', async () => {
                const testClient = new LocalTestClient(name)
                scope
                    .get(`/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`)
                    .times(2)
                    .reply(200, config)

                await testClient.createClient(true, { configPollingIntervalMS: 3000 })

                expect(scope.pendingMocks().length).toEqual(1)

                await wait(3100)
                await testClient.close()
            }, 5000)
        })
    })
})
