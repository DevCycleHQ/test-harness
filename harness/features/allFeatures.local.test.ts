import {
    getConnectionStringForProxy,
    forEachSDK,
    describeIf,
    createUser,
    LocalTestClient,
    waitForRequest
} from '../helpers'
import { Capabilities, SDKCapabilities } from '../types'
import { getServerScope } from '../nock'
import { config, expectedFeaturesVariationOn } from '../mockData/config'

jest.setTimeout(10000)

const scope = getServerScope()

describe('allFeatures Tests - Local', () => {
    forEachSDK((name) => {
        let url: string
        const capabilities: string[] = SDKCapabilities[name]

        let variationOnUser: string
        let noVariationUser: string
        let invalidUser: string

        beforeAll(async () => {
            url = getConnectionStringForProxy(name)

            variationOnUser = (
                await createUser(url, { user_id: 'user1', customData: { 'should-bucket': true } })
            ).headers.get('location')

            noVariationUser = (
                await createUser(url, { user_id: 'user3' })
            ).headers.get('location')

            invalidUser = (
                await createUser(url, { name: 'invalid' })
            ).headers.get('location')
        })

        describeIf(capabilities.includes(Capabilities.local))(name, () => {
            describe('uninitialized client', () => {
                const testClient = new LocalTestClient(name)

                beforeAll(async () => {
                    await testClient.createClient()
                    const configRequestUrl = `/${testClient.clientLocation}/config/v1/server/${testClient.sdkKey}.json`
                    const interceptor = scope
                        .get(configRequestUrl)

                    interceptor.reply(404)

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
                    const featuresResponse = await testClient.callAllFeatures(variationOnUser)
                    const features = await featuresResponse.json()
                    expect(features).toMatchObject({})
                })

                it.failing('should throw exception if user is invalid',  async () => { // TODO fix in node sdk
                    const featuresResponse = await testClient.callAllFeatures(invalidUser)
                    const response = await featuresResponse.json()
                    expect(response.exception).toBe('Must have a user_id set on the user')
                })
            })

            describe('initialized client', () => {
                const testClient = new LocalTestClient(name)

                beforeAll(async () => {
                    scope
                        .get(`/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`)
                        .reply(200, config)
                    await testClient.createClient()
                    await testClient.callOnClientInitialized()
                })

                afterAll(() => {
                    testClient.close()
                })
                it('should return all features for user without custom data',  async () => {
                    const featuresResponse = await testClient.callAllFeatures(noVariationUser, false)
                it('should return all features for user without custom data',  async () => {
                    const featuresResponse = await testClient.callAllFeatures(noVariationUser)
                    const features = (await featuresResponse.json()).data
                    expect(features).toMatchObject({
                        'schedule-feature': { ...expectedFeaturesVariationOn['schedule-feature'] }
                    })
                })

                it('should return all features for user with custom data',  async () => {
                    const featuresResponse = await testClient.callAllFeatures(variationOnUser)
                    const features = (await featuresResponse.json()).data
                    expect(features).toMatchObject(expectedFeaturesVariationOn)

                })

                it('should throw exception if user is invalid',  async () => {
                    const featuresResponse = await testClient.callAllFeatures(invalidUser)
                    const response = await featuresResponse.json()
                    expect(response.exception).toBe('Must have a user_id set on the user')
                })
            })
        })
    })
})
