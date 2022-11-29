import { getConnectionStringForProxy, forEachSDK, describeIf, createClient, createUser } from '../helpers'
import { Capabilities, SDKCapabilities } from '../types'
import { v4 as uuidv4 } from 'uuid'
import { getServerScope } from '../mockServer'
import nock from 'nock'

jest.setTimeout(1000000)

const scope = getServerScope()

describe('Variable Tests - Cloud', () => {
    forEachSDK((name) => {
        let url: string
        const capabilities: string[] = SDKCapabilities[name]
        const clientId: string = uuidv4()

        beforeAll(async () => {
            url = getConnectionStringForProxy(name)
            await createClient(url, clientId, 'dvc_server_test_token')
        })

        describeIf(capabilities.includes(Capabilities.cloud))(name, () => {
            it('will return default value if variable called with invalid user before initialized',  async () => {
                const response = await createUser(url, { name: 'invalid user' })
                const invalidUser = await response.json()

                expect(invalidUser.entityType).toBe('User')
                expect(invalidUser.data.user_id).toBeUndefined()
                expect(invalidUser.data.name).toBe('invalid user')

                const userId = response.headers.get('location')
                expect(userId).toBe('user/0')

                const variableResponse = await callVariable(clientId, url, userId, 'var_key', 'default_value')
                const variable = await variableResponse.json()
                expect(variable.entityType).toBe('Variable')
                expect(variable.data.isDefaulted).toBeTruthy()
                expect(variable.data.key).toBe('var_key')
                expect(variable.data.value).toBe('default_value')
            })

            it('will throw error if variable called with invalid user after initialized',  async () => {
                const response = await createUser(url, { name: 'invalid user' })
                const invalidUser = await response.json()

                expect(invalidUser.entityType).toBe('User')
                expect(invalidUser.data.user_id).toBeUndefined()
                expect(invalidUser.data.name).toBe('invalid user')

                const userId = response.headers.get('location')
                expect(userId).toBe('user/0')

                scope
                    .post(`/client/${clientId}`)
                    .matchHeader('Content-Type', 'application/json').reply(200, {})
                const callbackURL = `http://host.docker.internal:${global.__MOCK_SERVER_PORT__}/client/${clientId}`
                const cbResponse = await callOnClientInitialized(clientId, url, callbackURL)
                await cbResponse.json()

                await new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({})
                    }, 1000)
                })

                const variableResponse = await callVariable(clientId, url, userId, 'var_key', 'default_value')
                const error = await variableResponse.json()
                expect(error.exception).toBe('Must have a user_id set on the user')
            })

            it.only('should return defaulted variable if called before client is initialized',  async () => {
                const response = await createUser(url, { user_id: 'valid_user' })
                const invalidUser = await response.json()

                expect(invalidUser.entityType).toBe('User')
                expect(invalidUser.data.user_id).toBe('valid_user')

                const userId = response.headers.get('location')
                expect(userId).toBe('user/0')

                const variableResponse = await callVariable(clientId, url, userId, 'var_key', 'default_value')
                const variable = await variableResponse.json()
                expect(variable.entityType).toBe('Variable')
                expect(variable.data.isDefaulted).toBeTruthy()
                expect(variable.data.key).toBe('var_key')
                expect(variable.data.value).toBe('default_value')
            })

            it('should call variables API without edgeDB option',  async () => {
                const newClientId = uuidv4()
                const newClient = await createClient(url, newClientId, 'SDK_KEY')
                const user = await createUser(url, { user_id: 'user1' })
                // TODO: wait for callback url for onClientInitialized
                const variableResponse = await callVariable(newClientId, url, 'user1', 'var_key', 'default_value')
                // expect(variableResponse.entityType).toBe('Variable')
                // expect(variableResponse.data.value).toBe('default_value')
            })

            it('should call variables API with edgeDB option',  async () => {
                const newClientId = uuidv4()
                const newClient = await createClient(url, newClientId, 'SDK_KEY', { edgeDB: true })
                const user = await createUser(url, { user_id: 'user1' })
                // TODO: wait for callback url for onClientInitialized
                const variableResponse = await callVariable(newClientId, url, 'user1', 'var_key', 'default_value')
                // expect(variableResponse.entityType).toBe('Variable')
                // expect(variableResponse.data.value).toBe('default_value')
            })

            it('should return defaulted variable if called before client is initialized - \
                mock server returns undefined',  async () => {
                const newClientId = uuidv4()
                const newClient = await createClient(url, newClientId, 'SDK_KEY')
                const user = await createUser(url, { user_id: 'user1' })
                // TODO: wait for callback url for onClientInitialized
                const variableResponse = await callVariable(newClientId, url, 'user1', 'var_key', 'default_value')
                // expect(variableResponse.entityType).toBe('Variable')
                // expect(variableResponse.data.value).toBe('default_value')
            })

            it('should return variable if mock server returns object matching default type',  async () => {
                const newClientId = uuidv4()
                const newClient = await createClient(url, newClientId, 'SDK_KEY')
                const user = await createUser(url, { user_id: 'user1' })
                // TODO: wait for callback url for onClientInitialized
                const variableResponse = await callVariable(newClientId, url, 'user1', 'var_key', 'default_value')
                // expect(variableResponse.entityType).toBe('Variable')
                // expect(variableResponse.data.value).toBe('default_value')
            })

            it('should return defaulted variable if mock server returns object not matching \
                default type',  async () => {
                const newClientId = uuidv4()
                const newClient = await createClient(url, newClientId, 'SDK_KEY')
                const user = await createUser(url, { user_id: 'user1' })
                // TODO: wait for callback url for onClientInitialized
                const variableResponse = await callVariable(newClientId, url, 'user1', 'var_key', 'default_value')
                // expect(variableResponse.entityType).toBe('Variable')
                // expect(variableResponse.data.value).toBe('default_value')
            })

            it('should return defaulted variable if mock server returns 500',  async () => {
                const newClientId = uuidv4()
                const newClient = await createClient(url, newClientId, 'SDK_KEY')
                const user = await createUser(url, { user_id: 'user1' })
                // TODO: wait for callback url for onClientInitialized
                const variableResponse = await callVariable(newClientId, url, 'user1', 'var_key', 'default_value')
                // expect(variableResponse.entityType).toBe('Variable')
                // expect(variableResponse.data.value).toBe('default_value')
            })
        })
    })

    const callVariable = async (clientId: string, url: string, userLocation: string, key: string, value: any) => {
        return await fetch(`${url}/client/${clientId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                command: 'variable',
                params: [
                    { location: `${userLocation}` },
                    { value: key },
                    { value: value }
                ]
            })
        })
    }

    const callOnClientInitialized = async (clientId: string, url: string, callbackURL: string) => {
        return await fetch(`${url}/client/${clientId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                command: 'onClientInitialized',
                params: [
                    { callbackURL }
                ]
            })
        })
    }
})
