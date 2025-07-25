import {
    DEFAULT_REASON_DETAILS,
    EVAL_REASON_DETAILS,
    EVAL_REASONS,
} from '@devcycle/types'
import {
    LocalTestClient,
    describeCapability,
    hasCapability,
    waitForRequest,
    getSDKScope,
} from '../helpers'
import { Capabilities } from '../types'

describe('Client Custom Data Tests', () => {
    const { sdkName, scope } = getSDKScope()

    describeCapability(sdkName, Capabilities.clientCustomData)(sdkName, () => {
        it('should set client custom data and use it for segmentation', async () => {
            const client = new LocalTestClient(sdkName, scope)

            scope.post(`/client/${client.clientId}/v1/events/batch`).reply(201)

            const customData = { 'should-bucket': true }
            await client.createClient(true)
            await client.callSetClientCustomData(customData)
            const user = { user_id: 'test-user' }
            const response = await client.callVariable(
                user,
                sdkName,
                'string-var',
                'string',
                'some-default',
            )
            const variable = await response.json()
            expect(variable).toEqual(
                expect.objectContaining({
                    entityType: 'Variable',
                    data: expect.objectContaining({
                        type: 'String',
                        isDefaulted: false,
                        key: 'string-var',
                        defaultValue: 'some-default',
                        value: 'string',
                        ...(hasCapability(sdkName, Capabilities.evalReason)
                            ? {
                                  eval: {
                                      details: `${EVAL_REASON_DETAILS.CUSTOM_DATA} -> should-bucket`,
                                      reason: EVAL_REASONS.TARGETING_MATCH,
                                      target_id: '638680d659f1b81cc9e6c5ab',
                                  },
                              }
                            : {}),
                    }),
                }),
            )
        })

        it('should do nothing when client has not initialized', async () => {
            const client = new LocalTestClient(sdkName)
            const configCall = scope.get(client.getValidConfigPath())

            configCall.delay(1000).reply(200, client.getValidConfig())

            const customData = { 'should-bucket': true }
            await client.createClient(false)
            await client.callSetClientCustomData(customData)
            await waitForRequest(
                scope,
                configCall,
                1000,
                'Config request timed out',
            )

            scope.post(`/client/${client.clientId}/v1/events/batch`).reply(201)

            const response = await client.callVariable(
                { user_id: 'user-id' },
                sdkName,
                'string-var',
                'string',
                'some-default',
            )
            const variable = await response.json()
            expect(variable).toEqual(
                expect.objectContaining({
                    entityType: 'Variable',
                    data: {
                        type: 'String',
                        isDefaulted: true,
                        key: 'string-var',
                        defaultValue: 'some-default',
                        value: 'some-default',
                        ...(hasCapability(sdkName, Capabilities.evalReason)
                            ? {
                                  evalReason: expect.toBeNil(),
                                  eval: {
                                      details:
                                          DEFAULT_REASON_DETAILS.MISSING_CONFIG,
                                      reason: EVAL_REASONS.DEFAULT,
                                  },
                              }
                            : {}),
                    },
                }),
            )
        })
    })
})
