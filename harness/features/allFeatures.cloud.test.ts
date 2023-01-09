import {
    getConnectionStringForProxy,
    forEachSDK,
    describeIf,
    createUser,
    CloudTestClient, describeCapability,
} from '../helpers'
import { Capabilities, SDKCapabilities } from '../types'
import { getServerScope } from '../nock'
import { expectedFeaturesVariationOn } from '../mockData'

const scope = getServerScope()

describe('allFeatures Tests - Cloud', () => {
    forEachSDK((name) => {
        const testClient = new CloudTestClient(name)

        beforeAll(async () => {
            await testClient.createClient({
                enableCloudBucketing: true,
            })
        })

        describeCapability(name, Capabilities.cloud)(name, () => {
            it('should return all features without edgeDB', async () => {
                scope
                    .post(`/client/${testClient.clientId}/v1/features`, (body) => body.user_id === 'user1')
                    .matchHeader('Content-Type', 'application/json')
                    .matchHeader('authorization', testClient.sdkKey)
                    .query((queryObj) => {
                        return !queryObj.enableEdgeDB
                    })
                    .reply(200, expectedFeaturesVariationOn)
                const featuresResponse = await testClient.callAllFeatures({
                    user_id: 'user1',
                    customData: { 'should-bucket': true }
                })

                const features = await featuresResponse.json()
                expect(features).toMatchObject({
                    entityType: 'Object',
                    data: expectedFeaturesVariationOn,
                    logs: []
                })
            })

            it('should return all features with edgeDB', async () => {
                const edgeDBTestClient = new CloudTestClient(name)
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
                    customData: { 'should-bucket': true }
                })
                const features = await featuresResponse.json()
                expect(features).toMatchObject({
                    entityType: 'Object',
                    data: expectedFeaturesVariationOn,
                    logs: []
                })
            })
        })
    })
})

