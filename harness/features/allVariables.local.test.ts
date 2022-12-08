import {
    getConnectionStringForProxy,
    forEachSDK,
    createClient,
    describeIf,
    callAllVariablesLocal,
    createUser,
    wait,
    mockServerUrl
} from '../helpers'
import { v4 as uuidv4 } from 'uuid'
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
        const clientId = uuidv4()
        const sdkKey = `server_${clientId}`
        let url: string

        beforeAll(async () => {
            configInterceptor = scope
                .get(`/client/${clientId}/config/v1/server/${sdkKey}.json`)
            configInterceptor
                .reply(200, config)
                .persist()

            url = getConnectionStringForProxy(name)
            await createClient(url, clientId, sdkKey, { baseURLOverride: `${mockServerUrl}/client/${clientId}` })
            await wait(500)
        })

        afterAll(() => {
            nock.removeInterceptor(configInterceptor)
        })

        describeIf(capabilities.includes(Capabilities.local))(name, () => {
            it('should return an empty object if client is not initialized', async () => {
                const clientId = uuidv4()
                const sdkKey = `server_${clientId}`
                scope
                    .get(`/client/${clientId}/config/v1/server/${sdkKey}.json`)
                    .delay(2000)
                    .reply(200, config)

                await createClient(url, clientId, sdkKey, { baseURLOverride: `${mockServerUrl}/client/${clientId}` })
                await wait(500)

                const user = {
                    user_id: 'test_user',
                    email: 'user@gmail.com',
                    age: '0',
                    customData: { 'should-bucket': true }
                }
                const userResponse = await createUser(url, user)
                const userLocation = userResponse.headers.get('Location')
                const response = await callAllVariablesLocal(clientId, url, userLocation)
                const { data: variablesMap } = await response.json()

                expect(variablesMap).toMatchObject({})
            })

            it('should throw an error if called with an invalid user', async () => {
                const user = {
                    name: 'invalid user'
                }
                const userResponse = await createUser(url, user)
                const userLocation = userResponse.headers.get('Location')
                const response = await callAllVariablesLocal(clientId, url, userLocation)
                const { exception } = await response.json()

                expect(exception).toEqual('Must have a user_id set on the user')
            })

            it('should return a variable map for a bucketed user', async () => {
                const user = {
                    user_id: 'test_user',
                    email: 'user@gmail.com',
                    age: '0',
                    customData: { 'should-bucket': true }
                }
                const userResponse = await createUser(url, user)
                const userLocation = userResponse.headers.get('Location')
                const response = await callAllVariablesLocal(clientId, url, userLocation)
                const { data: variablesMap, entityType } = await response.json()

                expect(entityType).toEqual('Object')
                expect(variablesMap).toEqual(variables)
            })
        })
    })
})
