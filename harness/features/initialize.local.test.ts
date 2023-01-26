import {
    forEachSDK,
    wait,
    LocalTestClient, describeCapability, expectErrorMessageToBe
} from '../helpers'
import { Capabilities } from '../types'
import { config, shouldBucketUser } from '../mockData'
import { getServerScope } from '../nock'

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

            it('stops the polling interval when the sdk key is invalid and cdn responds 403', async () => {
                const testClient = new LocalTestClient(name)

                scope
                    .get(`/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`)
                    .reply(403)

                await testClient.createClient(true, { configPollingIntervalMS: 1000 }, testClient.sdkKey, true)
                await wait(1100)
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

            it('uses the same config if the etag matches', async () => {
                const testClient = new LocalTestClient(name)
                scope
                    .get(`/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`)
                    .reply(200, config)

                scope
                    .get(`/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`)
                    .matchHeader('If-None-Match', (value) => {
                        return true
                    })
                    .reply(304, {})

                await testClient.createClient(true, { configPollingIntervalMS: 1000 })

                expect(scope.pendingMocks().length).toEqual(1)

                await wait(1100)
                expect(scope.pendingMocks().length).toEqual(0)
                scope.post(`/client/${testClient.clientId}/v1/events/batch`).reply(201)
                // make sure the original config is still in use
                const variable = await testClient.callVariable(shouldBucketUser, 'number-var', 0)
                expect((await variable.json()).data.value).toEqual(1)
                await testClient.close()
            })

            it('uses the same config if the refetch fails, after retrying once', async () => {
                const testClient = new LocalTestClient(name)
                scope
                    .get(`/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`)
                    .reply(200, config)

                scope
                    .get(`/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`)
                    .times(2)
                    .reply(503, {})

                await testClient.createClient(true, { configPollingIntervalMS: 1000 })

                expect(scope.pendingMocks().length).toEqual(1)

                await wait(1500)
                expect(scope.pendingMocks().length).toEqual(0)
                // make sure the original config is still in use
                scope.post(`/client/${testClient.clientId}/v1/events/batch`).reply(201)
                const variable = await testClient.callVariable(shouldBucketUser, 'number-var', 0)
                expect((await variable.json()).data.value).toEqual(1)
                await testClient.close()
            })

            it('uses the same config if the response is invalid JSON', async () => {
                const testClient = new LocalTestClient(name)
                scope
                    .get(`/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`)
                    .reply(200, config)

                scope
                    .get(`/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`)
                    .reply(200, "I'm not JSON!")

                await testClient.createClient(true, { configPollingIntervalMS: 1000 })

                expect(scope.pendingMocks().length).toEqual(1)

                await wait(1200)
                expect(scope.pendingMocks().length).toEqual(0)
                // make sure the original config is still in use
                scope.post(`/client/${testClient.clientId}/v1/events/batch`).reply(201)
                const variable = await testClient.callVariable(shouldBucketUser, 'number-var', 0)
                expect((await variable.json()).data.value).toEqual(1)
                await testClient.close()
            })
        })
    })
})
