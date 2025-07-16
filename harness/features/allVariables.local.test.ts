import {
    LocalTestClient,
    waitForRequest,
    getSDKScope,
    hasCapability,
    describeCapability,
} from '../helpers'
import { Capabilities } from '../types'
import { getMockedVariables } from '../mockData'

describe('allVariables Tests - Local', () => {
    const { sdkName, scope } = getSDKScope()

    //TODO: when tests are updated for OF-NodeJS eval capability, remove this allVariables capability wrapper
    describeCapability(sdkName, Capabilities.allVariables)(sdkName, () => {
        it('should return an empty object if client is not initialized', async () => {
            const delayClient = new LocalTestClient(sdkName)

            let interceptor = scope
                .get(delayClient.getValidConfigPath())
                .delay(2000)
            interceptor.reply(200, delayClient.getValidConfig())

            if (hasCapability(sdkName, Capabilities.sdkConfigEvent)) {
                interceptor = scope.post(
                    `/client/${delayClient.clientId}/v1/events/batch`,
                )
                interceptor.reply(201, {
                    message: 'Successfully received events.',
                })
            }

            await delayClient.createClient(false, {
                eventFlushIntervalMS: 500,
                logLevel: 'debug',
            })

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
                3000,
                'Config request never received!',
            )
        })

        it('should return a variable map for a bucketed user', async () => {
            const client = new LocalTestClient(sdkName, scope)

            if (hasCapability(sdkName, Capabilities.sdkConfigEvent)) {
                scope
                    .post(`/client/${client.clientId}/v1/events/batch`)
                    .reply(201, { message: 'Successfully received events.' })
            }

            await client.createClient(true, {
                configPollingIntervalMS: 60000,
                eventFlushIntervalMS: 500,
            })

            const response = await client.callAllVariables({
                user_id: 'test_user',
                email: 'user@gmail.com',
                customData: { 'should-bucket': true },
            })
            const { data: variablesMap, entityType } = await response.json()

            expect(entityType).toEqual('Object')
            expect(variablesMap).toEqual(
                getMockedVariables(
                    hasCapability(sdkName, Capabilities.variablesFeatureId),
                    hasCapability(sdkName, Capabilities.evalReason),
                ),
            )
        })
    })
})
