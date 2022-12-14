import {
    getConnectionStringForProxy,
    forEachSDK,
    describeIf,
    createUser,
    CloudTestClient,
} from '../helpers'
import { Capabilities, SDKCapabilities } from '../types'
import { getServerScope } from '../nock'
import { expectedFeaturesVariationOn } from '../mockData'

jest.setTimeout(10000)

const scope = getServerScope()

describe('allFeatures Tests - Cloud', () => {
    forEachSDK((name) => {
        const testClient = new CloudTestClient(name)

        let url: string
        const capabilities: string[] = SDKCapabilities[name]

        let variationOnUser: string
        let invalidUser: string

        beforeAll(async () => {
            url = getConnectionStringForProxy(name)
            await testClient.createClient({
                enableCloudBucketing: true,
            })

            variationOnUser = (
                await createUser(url, { user_id: 'user1', customData: { 'should-bucket': true } })
            ).headers.get('location')

            invalidUser = (
                await createUser(url, { name: 'invalid' })
            ).headers.get('location')
        })

        describeIf(capabilities.includes(Capabilities.cloud))(name, () => {
            it('should return all features without edgeDB', async () => {
                scope
                    .post(`/${testClient.clientLocation}/v1/features`, (body) => body.user_id === 'user1')
                    .matchHeader('Content-Type', 'application/json')
                    .matchHeader('authorization', testClient.sdkKey)
                    .query((queryObj) => {
                        return !queryObj.enableEdgeDB
                    })
                    .reply(200, expectedFeaturesVariationOn)
                const featuresResponse = await testClient.callAllFeatures(variationOnUser)

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
                    .post(`/${edgeDBTestClient.clientLocation}/v1/features`)
                    .matchHeader('Content-Type', 'application/json')
                    .matchHeader('authorization', edgeDBTestClient.sdkKey)
                    .query((queryObj) => {
                        return queryObj.enableEdgeDB === 'true'
                    })
                    .reply(200, expectedFeaturesVariationOn)

                const featuresResponse = await edgeDBTestClient.callAllFeatures(variationOnUser)
                const features = await featuresResponse.json()
                expect(features).toMatchObject({
                    entityType: 'Object',
                    data: expectedFeaturesVariationOn,
                    logs: []
                })
            })

            it('should throw exception if user is invalid',  async () => {
                const featuresResponse = await testClient.callAllFeatures(invalidUser, true)
                const response = await featuresResponse.json()
                expect(response.asyncError).toBe('Must have a user_id set on the user')
            })
        })
    })
})

