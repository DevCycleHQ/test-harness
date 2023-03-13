import {
    getConnectionStringForProxy,
    forEachSDK,
    LocalTestClient,
    describeCapability,
    waitForRequest
} from '../helpers'
import { Capabilities } from '../types'
import { config } from '../mockData'
import { getServerScope } from '../nock'

const scope = getServerScope()

describe('Client Custom Data Tests', () => {
    forEachSDK((name) => {
        let url: string
        beforeAll(async () => {
            url = getConnectionStringForProxy(name)
        })

        describeCapability(name, Capabilities.clientCustomData)(name, () => {
            it('should set client custom data and use it for segmentation', async () => {
                const client = new LocalTestClient(name)

                scope
                    .get(`/client/${client.clientId}/config/v1/server/${client.sdkKey}.json`)
                    .reply(200, config)

                scope
                    .post(`/client/${client.clientId}/v1/events/batch`)
                    .reply(201)


                const customData = { 'should-bucket': true }
                await client.createClient(true)
                await client.callSetClientCustomData(customData)
                const user = { user_id: 'test-user'}
                const response = await client.callVariable(user, 'string-var', 'some-default')
                const variable = await response.json()
                expect(variable).toEqual(expect.objectContaining({
                    entityType: 'Variable',
                    data: {
                        type: 'String',
                        isDefaulted: false,
                        key: 'string-var',
                        defaultValue: 'some-default',
                        value: 'string'
                    }
                }))
            })

            it('should do nothing when client has not initialized', async () => {
                const client = new LocalTestClient(name)
                const configCall = scope
                    .get(`/client/${client.clientId}/config/v1/server/${client.sdkKey}.json`)

                configCall
                    .delay(1000)
                    .reply(200, config)

                const customData = { 'should-bucket': true }
                await client.createClient(false)
                await client.callSetClientCustomData(customData)
                await waitForRequest(scope, configCall, 1000, 'Config request timed out')

                scope.post(`/client/${client.clientId}/v1/events/batch`).reply(201)

                const response = await client.callVariable({ user_id: 'user-id' }, 'string-var', 'some-default')
                const variable = await response.json()
                expect(variable).toEqual(expect.objectContaining({
                    entityType: 'Variable',
                    data: {
                        type: 'String',
                        isDefaulted: true,
                        key: 'string-var',
                        defaultValue: 'some-default',
                        value: 'some-default'
                    }
                }))
            })
        })
    })
})

