import {
    getConnectionStringForProxy,
    forEachSDK,
    describeIf,
    createUser,
    CloudTestClient,
} from '../helpers'
import { getServerScope } from '../nock'
import { Capabilities, SDKCapabilities } from '../types'
import { variables } from '../mockData'

jest.setTimeout(10000)

describe('allVariables Tests - Cloud', () => {
    const scope = getServerScope()

    forEachSDK((name: string) => {
        const capabilities: string[] = SDKCapabilities[name]
        let url: string

        let client = new CloudTestClient(name)

        beforeAll(async () => {
            url = getConnectionStringForProxy(name)
            await client.createClient()
        })

        describeIf(capabilities.includes(Capabilities.cloud))(name, () => {
            it('should return an empty object if variables request fails', async () => {
                scope
                    .post(`/client/${client.clientId}/v1/variables`)
                    .reply(404)

                const user = {
                    user_id: 'test_user',
                    email: 'user@gmail.com',
                    age: '0',
                }
                const userResponse = await createUser(url, user)
                const userLocation = userResponse.headers.get('Location')
                const response = await client.callAllVariables(userLocation)
                const { data: variablesMap } = await response.json()

                expect(variablesMap).toMatchObject({})
            })

            it('should throw an error if called with an invalid user', async () => {
                const user = {
                    name: 'invalid user'
                }
                const userResponse = await createUser(url, user)
                const userLocation = userResponse.headers.get('Location')
                const response = await client.callAllVariables(userLocation, true)
                const { asyncError } = await response.json()

                expect(asyncError).toEqual('Must have a user_id set on the user')
            })

            it('should return a variable map', async () => {
                scope
                    .post(`/client/${client.clientId}/v1/variables`)
                    .reply(200, variables)

                const user = {
                    user_id: 'test_user',
                    email: 'user@gmail.com',
                    age: '0',
                }
                const userResponse = await createUser(url, user)
                const userLocation = userResponse.headers.get('Location')
                const response = await client.callAllVariables(userLocation)
                const { data: variablesMap, entityType } = await response.json()

                expect(entityType).toEqual('Object')
                expect(variablesMap).toEqual(variables)
            })

            it('should make a request to the variables endpoint with edgeDB param to false', async () => {
                scope
                    .post(`/client/${client.clientId}/v1/variables`)
                    .query((queryObj) => {
                        return !queryObj.enableEdgeDB
                    })
                    .reply(200, variables)

                const user = {
                    user_id: 'test_user',
                    email: 'user@gmail.com',
                    age: '0',
                }
                const userResponse = await createUser(url, user)
                const userLocation = userResponse.headers.get('Location')
                await client.callAllVariables(userLocation)
            })

            it('should make a request to the variables endpoint with edgeDB param to true', async () => {
                const client = new CloudTestClient(name)
                scope
                    .post(`/client/${client.clientId}/v1/variables`)
                    .query((queryObj) => {
                        return queryObj.enableEdgeDB === 'true'
                    })
                    .reply(200, variables)

                await client.createClient({
                    enableEdgeDB: true
                })

                const user = {
                    user_id: 'test_user',
                    email: 'user@gmail.com',
                    age: '0',
                }
                const userResponse = await createUser(url, user)
                const userLocation = userResponse.headers.get('Location')
                await client.callAllVariables(userLocation)
            })
        })
    })
})
