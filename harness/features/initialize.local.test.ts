import {
    wait,
    LocalTestClient,
    expectErrorMessageToBe,
    hasCapability,
    getSDKScope,
    interceptEvents,
    expectAggregateEvaluationEvent,
    expectAggregateDefaultEvent,
    waitForRequest,
} from '../helpers'
import { Capabilities } from '../types'
import { shouldBucketUser } from '../mockData'
import { Interceptor } from 'nock'

const lastModifiedDate = new Date()

describe('Initialize Tests - Local', () => {
    const { sdkName, scope } = getSDKScope()

    const addEventsBatchMock = (client: LocalTestClient) => {
        if (hasCapability(sdkName, Capabilities.sdkConfigEvent)) {
            return scope
                .post(`/client/${client.clientId}/v1/events/batch`)
                .reply(201)
        }
    }

    it('should error when SDK key is missing', async () => {
        const testClient = new LocalTestClient(sdkName)
        const response = await testClient.createClient(true, {}, null, true)
        const { exception } = await response.json()

        expectErrorMessageToBe(
            exception,
            'Missing SDK key! Call initialize with a valid SDK key',
            'Invalid SDK key provided. Please call initialize with a valid server SDK key',
        )
    })

    it('should error when SDK key is invalid', async () => {
        const testClient = new LocalTestClient(sdkName)
        const response = await testClient.createClient(
            true,
            {},
            'invalid key',
            true,
        )
        const { exception } = await response.json()

        expectErrorMessageToBe(
            exception,
            'Invalid SDK key provided. Please call initialize with a valid server SDK key',
        )
    })

    it('initializes correctly on valid data', async () => {
        const testClient = new LocalTestClient(sdkName, scope)
        addEventsBatchMock(testClient)

        const response = await testClient.createClient(true, {
            configPollingIntervalMS: 10000,
        })
        const { message } = await response.json()

        expect(message).toEqual('success')
    })

    it('calls initialize promise/callback when config is successfully retrieved', async () => {
        const testClient = new LocalTestClient(sdkName, scope)
        addEventsBatchMock(testClient)

        await testClient.createClient(true, {
            configPollingIntervalMS: 10000,
        })
    })

    it('calls initialize promise/callback when config fails to be retrieved', async () => {
        const testClient = new LocalTestClient(sdkName)

        scope.get(testClient.getValidConfigPath()).times(2).reply(500)

        await testClient.createClient(true, {
            configPollingIntervalMS: 10000,
        })
    })

    it('defaults variable when config fails to be retrieved, and then recovers', async () => {
        const testClient = new LocalTestClient(sdkName)
        const configRequestUrl = testClient.getValidConfigPath()

        // a 500 is a recoverable error so it will retry the connection and potentially make more requests than expected.
        scope.get(configRequestUrl).times(3).reply(500)
        scope.post(`/client/${testClient.clientId}/v1/events/batch`).reply(201)
        await testClient.createClient(true, {
            configPollingIntervalMS: 2300,
        })

        const variable = await testClient.callVariable(
            shouldBucketUser,
            sdkName,
            'number-var',
            'number',
            0,
        )
        expect((await variable.json()).data.value).toEqual(0)
        scope.get(configRequestUrl).reply(200, testClient.getValidConfig)

        await wait(2500)
        const variable2 = await testClient.callVariable(
            shouldBucketUser,
            sdkName,
            'number-var',
            'number',
            0,
        )
        expect((await variable2.json()).data.value).toEqual(1)
    })

    // TODO DVC-6016 investigate why these were failing on the nodeJS SDK
    it.skip(
        'stops the polling interval when the sdk key is invalid and cdn responds 403,' +
            ' throws error',
        async () => {
            const testClient = new LocalTestClient(sdkName)

            scope.get(testClient.getValidConfigPath()).reply(403)

            const response = await testClient.createClient(
                true,
                { configPollingIntervalMS: 1000 },
                testClient.sdkKey,
                true,
            )
            const { exception } = await response.json()

            expectErrorMessageToBe(
                exception,
                'Invalid environment key provided. Please call initialize with a valid server environment key',
            )
        },
    )

    it('fetches config again after 3 seconds when config polling interval is overriden', async () => {
        const testClient = new LocalTestClient(sdkName)
        scope
            .get(testClient.getValidConfigPath())
            .times(2)
            .reply(200, testClient.getValidConfig)
        addEventsBatchMock(testClient)

        await testClient.createClient(true, {
            configPollingIntervalMS: 3000,
        })

        expect(scope.pendingMocks().length).toEqual(
            hasCapability(sdkName, Capabilities.sdkConfigEvent) ? 2 : 1,
        )

        await wait(3100)
    }, 5000)

    it('uses the same config if the etag matches', async () => {
        const testClient = new LocalTestClient(sdkName)
        const configRequestUrl = testClient.getValidConfigPath()
        scope.get(configRequestUrl).reply(200, testClient.getValidConfig(), {
            ETag: 'test-etag',
            'Last-Modified': lastModifiedDate.toUTCString(),
        })
        addEventsBatchMock(testClient)

        if (hasCapability(sdkName, Capabilities.lastModifiedHeader)) {
            scope
                .get(configRequestUrl)
                .matchHeader('If-None-Match', 'test-etag')
                .matchHeader(
                    'If-Modified-Since',
                    lastModifiedDate.toUTCString(),
                )
                .reply(304, {})
        } else {
            scope
                .get(configRequestUrl)
                .matchHeader('If-None-Match', 'test-etag')
                .reply(304, {})
        }

        await testClient.createClient(true, {
            configPollingIntervalMS: 1000,
            eventFlushIntervalMS: 500,
        })

        expect(scope.pendingMocks().length).toEqual(
            hasCapability(sdkName, Capabilities.sdkConfigEvent) ? 2 : 1,
        )

        await wait(1100)
        expect(scope.pendingMocks().length).toEqual(0)

        scope.post(`/client/${testClient.clientId}/v1/events/batch`).reply(201)

        // make sure the original config is still in use
        const variable = await testClient.callVariable(
            shouldBucketUser,
            sdkName,
            'number-var',
            'number',
            0,
        )
        expect((await variable.json()).data.value).toEqual(1)
    })

    it('uses the same config if the refetch fails, after retrying once', async () => {
        const testClient = new LocalTestClient(sdkName, scope)

        scope.get(testClient.getValidConfigPath()).times(2).reply(503, {})

        await testClient.createClient(true, {
            configPollingIntervalMS: 1000,
        })

        expect(scope.pendingMocks().length).toEqual(1)

        await wait(1500)
        expect(scope.pendingMocks().length).toEqual(0)
        // make sure the original config is still in use
        scope.post(`/client/${testClient.clientId}/v1/events/batch`).reply(201)

        const variable = await testClient.callVariable(
            shouldBucketUser,
            sdkName,
            'number-var',
            'number',
            0,
        )
        expect((await variable.json()).data.value).toEqual(1)
    })

    it('uses the same config if the response is invalid JSON', async () => {
        const testClient = new LocalTestClient(sdkName, scope)

        scope.get(testClient.getValidConfigPath()).reply(200, "I'm not JSON!")

        await testClient.createClient(true, {
            configPollingIntervalMS: 1000,
        })

        expect(scope.pendingMocks().length).toEqual(1)

        await wait(1200)
        expect(scope.pendingMocks().length).toEqual(0)
        // make sure the original config is still in use
        scope.post(`/client/${testClient.clientId}/v1/events/batch`).reply(201)

        const variable = await testClient.callVariable(
            shouldBucketUser,
            sdkName,
            'number-var',
            'number',
            0,
        )
        expect((await variable.json()).data.value).toEqual(1)
    })

    it('uses the same config if the response is valid JSON but invalid data', async () => {
        const testClient = new LocalTestClient(sdkName, scope)
        addEventsBatchMock(testClient)

        scope
            .get(testClient.getValidConfigPath())
            .reply(200, '{"snatch_movie_quote": "d\'ya like dags?"}')

        await testClient.createClient(true, {
            configPollingIntervalMS: 1000,
            eventFlushIntervalMS: 500,
        })

        expect(scope.pendingMocks().length).toEqual(
            hasCapability(sdkName, Capabilities.sdkConfigEvent) ? 2 : 1,
        )

        await wait(1200)
        expect(scope.pendingMocks().length).toEqual(0)
        // make sure the original config is still in use
        scope.post(`/client/${testClient.clientId}/v1/events/batch`).reply(201)

        const variable = await testClient.callVariable(
            shouldBucketUser,
            sdkName,
            'number-var',
            'number',
            0,
        )
        expect((await variable.json()).data.value).toEqual(1)
    })

    it('uses the new config when etag changes, and flushes existing events', async () => {
        const testClient = new LocalTestClient(sdkName)
        const configRequestUrl = testClient.getValidConfigPath()
        const firstConfig = scope.get(configRequestUrl).times(1)

        firstConfig.reply(200, testClient.getValidConfig(), {
            ETag: 'first-etag',
            'Cf-Ray': 'first-ray',
            'Last-Modified': lastModifiedDate.toUTCString(),
        })

        const secondLastModifiedDate = new Date(Date.now() + 200000)
        let secondConfig: Interceptor
        if (hasCapability(sdkName, Capabilities.lastModifiedHeader)) {
            secondConfig = scope
                .get(configRequestUrl)
                .matchHeader('If-None-Match', (value) => {
                    return value === 'first-etag'
                })
                .matchHeader('If-Modified-Since', (value) => {
                    return value === lastModifiedDate.toUTCString()
                })

            secondConfig.reply(
                200,
                { ...testClient.getValidConfig(), features: [] },
                {
                    ETag: 'second-etag',
                    'Cf-Ray': 'second-ray',
                    'Last-Modified': secondLastModifiedDate.toUTCString(),
                },
            )
        } else {
            secondConfig = scope
                .get(configRequestUrl)
                .matchHeader('If-None-Match', (value) => {
                    return value === 'first-etag'
                })

            secondConfig.reply(
                200,
                { ...testClient.getValidConfig(), features: [] },
                { ETag: 'second-etag', 'Cf-Ray': 'second-ray' },
            )
        }

        const eventResult = interceptEvents(
            scope,
            sdkName,
            `/client/${testClient.clientId}/v1/events/batch`,
        )
        const secondEventResult = interceptEvents(
            scope,
            sdkName,
            `/client/${testClient.clientId}/v1/events/batch`,
        )

        await testClient.createClient(true, {
            configPollingIntervalMS: 1000,
            eventFlushIntervalMS: 500,
        })

        // make sure the original config is in use (expected variable value is 1)
        const variable = await testClient.callVariable(
            shouldBucketUser,
            sdkName,
            'number-var',
            'number',
            0,
        )
        expect((await variable.json()).data.value).toEqual(1)
        await eventResult.wait()

        expect(scope.pendingMocks().length).toEqual(2)

        // wait for the next config polling request
        await waitForRequest(
            scope,
            secondConfig,
            2000,
            'Config polling timed out',
        )

        await wait(50)
        // make sure the new config is in use (new config should not bucket the user because features are blank)
        const variable2 = await testClient.callVariable(
            shouldBucketUser,
            sdkName,
            'number-var',
            'number',
            0,
        )
        expect((await variable2.json()).data.value).toEqual(0)
        await secondEventResult.wait()
        expect(scope.pendingMocks().length).toEqual(0)
        const config = testClient.getValidConfig()
        if (hasCapability(sdkName, Capabilities.etagReporting)) {
            expectAggregateEvaluationEvent({
                body: eventResult.body,
                variableKey: 'number-var',
                featureId: config.features[0]._id,
                variationId: config.features[0].variations[0]._id,
                etag: 'first-etag',
                rayId: 'first-ray',
                lastModified: lastModifiedDate.toUTCString(),
            })
            expectAggregateDefaultEvent({
                body: secondEventResult.body,
                variableKey: 'number-var',
                defaultReason: 'MISSING_FEATURE',
                etag: 'second-etag',
                rayId: 'second-ray',
                lastModified: secondLastModifiedDate.toUTCString(),
            })
        }
    })
})
