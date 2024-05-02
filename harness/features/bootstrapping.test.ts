import { describeCapability, getSDKScope, LocalTestClient } from '../helpers'
import { Capabilities } from '../types'
import { config } from '../mockData'
import immutable from 'object-path-immutable'

describe('Bootstrapping Tests', () => {
    const { sdkName, scope } = getSDKScope()

    describeCapability(sdkName, Capabilities.bootstrapping)(sdkName, () => {
        let testClient: LocalTestClient

        describe('not enabled client', () => {
            beforeEach(async () => {
                testClient = new LocalTestClient(sdkName)
                scope
                    .get(
                        `/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`,
                    )
                    .reply(200, config)

                await testClient.createClient(true, {
                    configPollingIntervalMS: 100000,
                    eventFlushIntervalMS: 500,
                })
            })
            it('throws an error when trying to get bootstrap config if not enabled', async () => {
                await testClient.callGetClientBootstrapConfig(
                    {
                        user_id: 'test',
                    },
                    '',
                    true,
                )
            })
        })

        describe('initialized client', () => {
            beforeEach(async () => {
                testClient = new LocalTestClient(sdkName)
                scope
                    .get(
                        `/client/${testClient.clientId}/config/v1/server/${testClient.sdkKey}.json`,
                    )
                    .reply(200, config)

                // create a different config clientside so we can make sure the bootstrapping method is using the right one
                const clientsideConfig = immutable.set(
                    config,
                    'features.0.variations.0.variables.1.value',
                    'new string',
                )

                scope
                    .get(
                        `/client/${testClient.clientId}/config/v1/server/bootstrap/${testClient.sdkKey}.json`,
                    )
                    .reply(200, clientsideConfig)

                await testClient.createClient(true, {
                    configPollingIntervalMS: 100000,
                    eventFlushIntervalMS: 500,
                    enableClientBootstrapping: true,
                })
            })

            it('should return a client bootstrapped config', async () => {
                const configResponse =
                    await testClient.callGetClientBootstrapConfig(
                        {
                            user_id: 'test',
                            customData: {
                                'should-bucket': true,
                            },
                        },
                        '',
                    )

                const configResult = await configResponse.json()

                expect(configResult.data.variables['string-var'].value).toEqual(
                    'new string',
                )

                expect(configResult).toMatchSnapshot()
            })
        })
    })
})
