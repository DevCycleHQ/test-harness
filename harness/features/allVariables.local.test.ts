import {
    getConnectionStringForProxy,
    LocalTestClient,
    describeCapability,
    waitForRequest,
    getSDKScope,
} from '../helpers'
import { Capabilities } from '../types'
import { config, variables } from '../mockData'
import { Interceptor } from 'nock'

describe('allVariables Tests - Local', () => {
    const { sdkName, scope } = getSDKScope()
    let configInterceptor: Interceptor
    let url: string
    let client: LocalTestClient

    beforeEach(async () => {
        client = new LocalTestClient(sdkName)
        configInterceptor = scope.get(
            `/client/${client.clientId}/config/v1/server/${client.sdkKey}.json`,
        )
        configInterceptor.reply(200, config)

        url = getConnectionStringForProxy(sdkName)
        await client.createClient(true, {
            configPollingIntervalMS: 60000,
        })
    })

    describeCapability(sdkName, Capabilities.local)(sdkName, () => {
        it('should return an empty object if client is not initialized', async () => {
            const delayClient = new LocalTestClient(sdkName)

            const interceptor = scope
                .get(
                    `/client/${delayClient.clientId}/config/v1/server/${delayClient.sdkKey}.json`,
                )
                .delay(2000)

            interceptor.reply(200, config)

            await delayClient.createClient(false)

            const response = await delayClient.callAllVariables({
                user_id: 'test_user',
                email: 'user@gmail.com',
                customData: { 'should-bucket': true },
            })
            const { data: variablesMap } = await response.json()

            expect(variablesMap).toMatchObject({})
            await waitForRequest(
                scope,
                interceptor,
                1000,
                'Config request never received!',
            )
        })

        it('should return a variable map for a bucketed user', async () => {
            const response = await client.callAllVariables({
                user_id: 'test_user',
                email: 'user@gmail.com',
                customData: { 'should-bucket': true },
            })
            const { data: variablesMap, entityType } = await response.json()

            expect(entityType).toEqual('Object')
            expect(variablesMap).toEqual(variables)
        })
    })
})
