import {
    getConnectionStringForProxy,
    forEachSDK,
    LocalTestClient, describeCapability
} from '../helpers'
import { Capabilities } from '../types'
import { config, variables } from '../mockData'
import { Interceptor } from 'nock'
import { getServerScope } from '../nock'

describe('allVariables Tests - Local', () => {
    const scope = getServerScope()
    let configInterceptor: Interceptor

    forEachSDK((name: string) => {
        let url: string

        const client = new LocalTestClient(name)

        beforeAll(async () => {
            configInterceptor = scope
                .get(`/client/${client.clientId}/config/v1/server/${client.sdkKey}.json`)
            configInterceptor
                .reply(200, config)

            url = getConnectionStringForProxy(name)
            await client.createClient(true)
        })

        afterAll(async () => {
            await client.close()
        })

        describeCapability(name, Capabilities.local)(name, () => {
            it('should return an empty object if client is not initialized', async () => {
                const delayClient = new LocalTestClient(name)

                scope
                    .get(`/client/${delayClient.clientId}/config/v1/server/${delayClient.sdkKey}.json`)
                    .delay(2000)
                    .reply(200, config)

                await delayClient.createClient(false)

                const response = await delayClient.callAllVariables({
                    user_id: 'test_user',
                    email: 'user@gmail.com',
                    customData: { 'should-bucket': true }
                })
                const { data: variablesMap } = await response.json()

                expect(variablesMap).toMatchObject({})
                await delayClient.close()
            })

            it('should return a variable map for a bucketed user', async () => {
                const response = await client.callAllVariables({
                    user_id: 'test_user',
                    email: 'user@gmail.com',
                    customData: { 'should-bucket': true }
                })
                const { data: variablesMap, entityType } = await response.json()

                expect(entityType).toEqual('Object')
                expect(variablesMap).toEqual(variables)
            })
        })
    })
})
