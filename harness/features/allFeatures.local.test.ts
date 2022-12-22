import {
    forEachSDK,
    LocalTestClient,
    waitForRequest, describeCapability
} from '../helpers'
import { Capabilities } from '../types'
import { getServerScope } from '../nock'
import { config, expectedFeaturesVariationOn } from '../mockData/config'

jest.setTimeout(10000)

const scope = getServerScope()

describe('allFeatures Tests - Local', () => {
    forEachSDK((name) => {
        describeCapability(name, Capabilities.local)(name, () => {
            describe('uninitialized client', () => {
                const testClient = new LocalTestClient(name)

                beforeAll(async () => {
                    const configRequestUrl = `/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`
                    const interceptor = scope
                        .get(configRequestUrl)

                    interceptor.reply(404)
                    await testClient.createClient(false)

                    await waitForRequest(
                        scope,
                        interceptor,
                        3000,
                        'Config request timed out'
                    )
                })

                afterAll(async () => {
                    await testClient.close()
                })

                it('should return empty object if client is uninitialized',  async () => {
                    const featuresResponse = await testClient.callAllFeatures({
                        user_id: 'user1',
                        customData: { 'should-bucket': true }
                    })
                    const features = await featuresResponse.json()
                    expect(features).toMatchObject({})
                })
            })

            describe('initialized client', () => {
                const testClient = new LocalTestClient(name)

                beforeAll(async () => {
                    scope
                        .get(`/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`)
                        .reply(200, config)
                    await testClient.createClient(true)
                })

                afterAll(async () => {
                    await testClient.close()
                })

                it('should return all features for user without custom data',  async () => {
                    const featuresResponse = await testClient.callAllFeatures({ user_id: 'user3' })
                    const features = (await featuresResponse.json()).data
                    expect(features).toMatchObject({
                        'schedule-feature': { ...expectedFeaturesVariationOn['schedule-feature'] }
                    })
                })

                it('should return all features for user with custom data',  async () => {
                    const featuresResponse = await testClient.callAllFeatures({
                        user_id: 'user1',
                        customData: { 'should-bucket': true }
                    })
                    const features = (await featuresResponse.json()).data
                    expect(features).toMatchObject(expectedFeaturesVariationOn)
                })
            })
        })
    })
})
