import {
    getConnectionStringForProxy,
    forEachSDK,
    describeIf,
    createUser,
    wait,
    LocalTestClient
} from '../helpers'
import { Capabilities, SDKCapabilities } from '../types'
import { config, variables } from '../mockData'
import nock, { Interceptor } from 'nock'
import { getServerScope } from '../nock'

jest.setTimeout(10000)

describe('allVariables Tests - Local', () => {
    const scope = getServerScope()
    let configInterceptor: Interceptor

    forEachSDK((name: string) => {
        const capabilities: string[] = SDKCapabilities[name]
        let url: string

        let client = new LocalTestClient(name)

        beforeAll(async () => {
            configInterceptor = scope
                .get(`/client/${client.clientId}/config/v1/server/${client.sdkKey}.json`)
            configInterceptor
                .reply(200, config)

            url = getConnectionStringForProxy(name)
            await client.createClient()
            await client.callOnClientInitialized()
        })

        afterAll(async () => {
            await client.close()
        })

        describeIf(capabilities.includes(Capabilities.local))(name, () => {
            it('should return an empty object if client is not initialized', async () => {
                const delayClient = new LocalTestClient(name)

                scope
                    .get(`/client/${delayClient.clientId}/config/v1/server/${delayClient.sdkKey}.json`)
                    .delay(2000)
                    .reply(200, config)

                await delayClient.createClient()

                const user = {
                    user_id: 'test_user',
                    email: 'user@gmail.com',
                    customData: { 'should-bucket': true }
                }
                const userResponse = await createUser(url, user)
                const userLocation = userResponse.headers.get('Location')
                const response = await delayClient.callAllVariables(userLocation)
                const { data: variablesMap } = await response.json()

                expect(variablesMap).toMatchObject({})
                await delayClient.close()
            })

            it('should throw an error if called with an invalid user', async () => {
                const user = {
                    name: 'invalid user'
                }
                const userResponse = await createUser(url, user)
                const userLocation = userResponse.headers.get('Location')
                const response = await client.callAllVariables(userLocation, true)
                const { exception } = await response.json()

                expect(exception).toEqual('Must have a user_id set on the user')
            })

            it('should return a variable map for a bucketed user', async () => {
                const user = {
                    user_id: 'test_user',
                    email: 'user@gmail.com',
                    customData: { 'should-bucket': true }
                }
                const userResponse = await createUser(url, user)
                const userLocation = userResponse.headers.get('Location')
                const response = await client.callAllVariables(userLocation)
                const { data: variablesMap, entityType } = await response.json()

                expect(entityType).toEqual('Object')
                expect(variablesMap).toEqual(variables)
            })
        })
    })
})
