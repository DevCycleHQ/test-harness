import {
    LocalTestClient,
    getSDKScope,
    hasCapability,
    describeCapability,
} from '../helpers'
import { Capabilities } from '../types'
import { expectedFeaturesVariationOn } from '../mockData'

describe('allFeatures Tests - Local', () => {
    const { sdkName, scope } = getSDKScope()

    describeCapability(sdkName, Capabilities.allFeatures)(sdkName, () => {
        describe('uninitialized client', () => {
            let testClient: LocalTestClient

            beforeEach(async () => {
                testClient = new LocalTestClient(sdkName)
                const configRequestUrl = testClient.getValidConfigPath()
                scope.get(configRequestUrl).times(2).reply(500)
                await testClient.createClient(true, {
                    configPollingIntervalMS: 60000,
                })
            })

            it('should return empty object if client is uninitialized', async () => {
                const featuresResponse = await testClient.callAllFeatures({
                    user_id: 'user1',
                    customData: { 'should-bucket': true },
                })
                const features = await featuresResponse.json()
                expect(features).toMatchObject({})
            })
        })

        describe('initialized client', () => {
            let testClient: LocalTestClient

            beforeEach(async () => {
                testClient = new LocalTestClient(sdkName, scope)
                if (hasCapability(sdkName, Capabilities.sdkConfigEvent)) {
                    scope
                        .post(`/client/${testClient.clientId}/v1/events/batch`)
                        .reply(201, {
                            message: 'Successfully received events.',
                        })
                }

                await testClient.createClient(true, {
                    configPollingIntervalMS: 60000,
                })
            })

            it('should return all features for user without custom data', async () => {
                const featuresResponse = await testClient.callAllFeatures({
                    user_id: 'user3',
                })
                const features = (await featuresResponse.json()).data
                expect(features).toMatchObject({
                    'schedule-feature': {
                        ...expectedFeaturesVariationOn['schedule-feature'],
                    },
                })
            })

            it('should return all features for user with custom data', async () => {
                const featuresResponse = await testClient.callAllFeatures({
                    user_id: 'user1',
                    customData: { 'should-bucket': true },
                })
                const features = (await featuresResponse.json()).data
                expect(features).toMatchObject(expectedFeaturesVariationOn)
            })
        })
    })
})
