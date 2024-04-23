import {
    CloudTestClient,
    describeCapability,
    expectErrorMessageToBe,
    getSDKScope,
} from '../helpers'
import { Capabilities } from '../types'
import { expectedFeaturesVariationOn } from '../mockData'

describe('allFeatures Tests - Cloud', () => {
    const { sdkName, scope } = getSDKScope()
    let testClient: CloudTestClient

    beforeEach(async () => {
        testClient = new CloudTestClient(sdkName)
        await testClient.createClient({
            enableCloudBucketing: true,
        })
    })

    describeCapability(sdkName, Capabilities.cloud)(sdkName, () => {
        it('should return all features without edgeDB', async () => {
            scope
                .post(
                    `/client/${testClient.clientId}/v1/features`,
                    (body) => body.user_id === 'user1',
                )
                .matchHeader('Content-Type', 'application/json')
                .matchHeader('authorization', testClient.sdkKey)
                .query((queryObj) => {
                    return !queryObj.enableEdgeDB
                })
                .reply(200, expectedFeaturesVariationOn)
            const featuresResponse = await testClient.callAllFeatures({
                user_id: 'user1',
                customData: { 'should-bucket': true },
            })

            const features = await featuresResponse.json()
            expect(features).toMatchObject({
                entityType: 'Object',
                data: expectedFeaturesVariationOn,
                logs: [],
            })
        })

        it('should return all features with edgeDB', async () => {
            const edgeDBTestClient = new CloudTestClient(sdkName)
            await edgeDBTestClient.createClient({
                enableEdgeDB: true,
                enableCloudBucketing: true,
            })

            scope
                .post(`/client/${edgeDBTestClient.clientId}/v1/features`)
                .matchHeader('Content-Type', 'application/json')
                .matchHeader('authorization', edgeDBTestClient.sdkKey)
                .query((queryObj) => {
                    return queryObj.enableEdgeDB === 'true'
                })
                .reply(200, expectedFeaturesVariationOn)

            const featuresResponse = await edgeDBTestClient.callAllFeatures({
                user_id: 'user1',
                customData: { 'should-bucket': true },
            })
            const features = await featuresResponse.json()
            expect(features).toMatchObject({
                entityType: 'Object',
                data: expectedFeaturesVariationOn,
                logs: [],
            })
        })

        // TODO DVC-5954 investigate why these were failing on the SDKs
        it.skip('should throw if features request fails on invalid sdk key', async () => {
            scope
                .post(`/client/${testClient.clientId}/v1/features`)
                .reply(401, { message: 'Invalid sdk key' })

            const response = await testClient.callAllFeatures(
                {
                    user_id: 'user1',
                },
                true,
            )
            const res = await response.json()
            expectErrorMessageToBe(
                res.asyncError,
                'Invalid sdk key',
                'Invalid SDK Key',
            )
        })
    })
})
