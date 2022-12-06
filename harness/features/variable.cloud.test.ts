import {
    getConnectionStringForProxy,
    forEachSDK,
    describeIf,
    createClient,
    createUser,
    callVariable,
    forEachVariableType,
    variablesForTypes
} from '../helpers'
import { Capabilities, SDKCapabilities } from '../types'
import { v4 as uuidv4 } from 'uuid'
import { getServerScope } from '../mockServer'

jest.setTimeout(10000)

const scope = getServerScope()

describe('Variable Tests - Cloud', () => {
    forEachSDK((name) => {
        let url: string
        const capabilities: string[] = SDKCapabilities[name]
        const clientId: string = uuidv4()
        const mockServerUrl
            = `http://${process.env.DOCKER_HOST_IP ?? 'host.docker.internal'}:${global.__MOCK_SERVER_PORT__}`

        beforeAll(async () => {
            url = getConnectionStringForProxy(name)
            await createClient(url, clientId, 'dvc_server_test_token', {
                baseURLOverride: `${mockServerUrl}/client/${clientId}`,
                enableCloudBucketing: true
            })
        })

        describeIf(capabilities.includes(Capabilities.cloud))(name, () => {
            it('will throw error variable called with invalid user',  async () => {
                const response = await createUser(url, { name: 'invalid user' })
                const invalidUser = await response.json()

                expect(invalidUser.entityType).toBe('User')
                expect(invalidUser.data.user_id).toBeUndefined()
                expect(invalidUser.data.name).toBe('invalid user')

                const userId = response.headers.get('location')
                expect(userId.includes('user/')).toBeTruthy()

                const variableResponse = await callVariable(clientId, url, userId, 'var_key', 'default_value')
                const error = await variableResponse.json()
                expect(error.exception).toBe('Must have a user_id set on the user')
            })

            it('will throw error variable called with invalid key',  async () => {
                const response = await createUser(url, { user_id: 'user1' })
                const invalidUser = await response.json()

                expect(invalidUser.entityType).toBe('User')
                expect(invalidUser.data.user_id).toBe('user1')

                const userId = response.headers.get('location')
                expect(userId.includes('user/')).toBeTruthy()

                const variableResponse = await callVariable(clientId, url, userId, undefined, 'default_value')
                const error = await variableResponse.json()
                expect(error.exception).toBe('Missing parameter: key')
            })

            it('will throw error variable called with invalid default value',  async () => {
                const response = await createUser(url, { user_id: 'user1' })
                const invalidUser = await response.json()

                expect(invalidUser.entityType).toBe('User')
                expect(invalidUser.data.user_id).toBe('user1')

                const userId = response.headers.get('location')
                expect(userId.includes('user/')).toBeTruthy()

                const variableResponse = await callVariable(clientId, url, userId, 'var_key')
                const error = await variableResponse.json()
                expect(error.exception).toBe('Missing parameter: defaultValue')
            })

            it('should call variables API without edgeDB option',  async () => {
                const response = await createUser(url, { user_id: 'user1' })
                await response.json()
                const userId = response.headers.get('location')

                scope
                    .post(`/client/${clientId}/v1/variables/var_key`, (body) => body.user_id === 'user1')
                    .matchHeader('Content-Type', 'application/json')
                    .matchHeader('authorization', 'dvc_server_test_token')
                    .query((queryObj) => {
                        return !queryObj.enableEdgeDB
                    })
                    .reply(200, {
                        key: 'var_key',
                        value: 'value',
                        defaultValue: 'default_value',
                        isDefaulted: false
                    })
                const variableResponse = await callVariable(clientId, url, userId, 'var_key', 'default_value')
                await variableResponse.json()
            })

            it('should call variables API with edgeDB option',  async () => {
                const response = await createUser(url, { user_id: 'user1' })
                await response.json()
                const userId = response.headers.get('location')

                const newClientId = uuidv4()
                await createClient(url, newClientId, 'dvc_server_test_token', {
                    baseURLOverride: `${mockServerUrl}/client/${newClientId}`,
                    enableCloudBucketing: true,
                    enableEdgeDB: true
                })

                scope
                    .post(`/client/${newClientId}/v1/variables/var_key`, (body) => body.user_id === 'user1')
                    .matchHeader('Content-Type', 'application/json')
                    .matchHeader('authorization', 'dvc_server_test_token')
                    .query((queryObj) => {
                        return !!queryObj.enableEdgeDB
                    })
                    .reply(200, {
                        key: 'var_key',
                        value: 'value',
                        defaultValue: 'default_value',
                        isDefaulted: false
                    })
                const variableResponse = await callVariable(newClientId, url, userId, 'var_key', 'default_value')
                await variableResponse.json()

            })

            forEachVariableType((type) => {
                it(`should return default ${type} variable if mock server returns undefined`,  async () => {
                    const response = await createUser(url, { user_id: 'user1' })
                    await response.json()
                    const userId = response.headers.get('location')

                    scope
                        .post(`/client/${clientId}/v1/variables/var_key`, (body) => body.user_id === 'user1')
                        .matchHeader('Content-Type', 'application/json')
                        .matchHeader('authorization', 'dvc_server_test_token')
                        .reply(200, undefined)

                    const variableResponse = await callVariable(
                        clientId,
                        url,
                        userId,
                        'var_key',
                        variablesForTypes[type].defaultValue
                    )
                    const variable = await variableResponse.json()

                    expect(variable).toEqual(expect.objectContaining({
                        entityType: 'Variable',
                        data: {
                            key: 'var_key',
                            value: variablesForTypes[type].defaultValue,
                            defaultValue: variablesForTypes[type].defaultValue,
                            isDefaulted: true
                        }
                    }))
                })

                it(`should return ${type} variable if mock server returns \
                proper variable matching default value type`,  async () => {
                    const response = await createUser(url, { user_id: 'user1' })
                    await response.json()
                    const userId = response.headers.get('location')

                    scope
                        .post(`/client/${clientId}/v1/variables/var_key`, (body) => body.user_id === 'user1')
                        .matchHeader('Content-Type', 'application/json')
                        .matchHeader('authorization', 'dvc_server_test_token')
                        .reply(200, variablesForTypes[type])

                    const variableResponse = await callVariable(
                        clientId,
                        url,
                        userId,
                        'var_key',
                        variablesForTypes[type].defaultValue
                    )
                    const variable = await variableResponse.json()

                    expect(variable).toEqual(expect.objectContaining({
                        entityType: 'Variable',
                        data: {
                            key: 'var_key',
                            value: variablesForTypes[type].value,
                            defaultValue: variablesForTypes[type].defaultValue,
                            isDefaulted: false
                        }
                    }))
                })

                // TODO: Fix nodejs to return default if default types don't match
                // it.only('should return default if mock server\
                // returns variable mismatching default value type',  async () => {
                //     const response = await createUser(url, { user_id: 'user1' })
                //     await response.json()
                //     const userId = response.headers.get('location')

                //     scope
                //         .post(`/client/${clientId}/v1/variables/var_key`, (body) => body.user_id === 'user1')
                //         .matchHeader('Content-Type', 'application/json')
                //         .matchHeader('authorization', 'dvc_server_test_token')
                //         .reply(200, {
                //             key: 'var_key',
                //             value: 5,
                //             defaultValue: 2,
                //             isDefaulted: false
                //         })

                //     const variableResponse = await callVariable(clientId, url, userId, 'var_key', 'string')
                //     const variable = await variableResponse.json()
                //     await wait(1000)

                //     expect(variable.entityType).toBe('Variable')
                //     expect(variable.data.isDefaulted).toBeTruthy()
                //     expect(variable.data.key).toBe('var_key')
                //     expect(variable.data.value).toBe(2)
                // })

                it(`should return defaulted ${type} variable if mock server returns an internal error, \
                after retrying 5 times`,  async () => {
                    const response = await createUser(url, { user_id: 'user1' })
                    await response.json()
                    const userId = response.headers.get('location')

                    scope
                        .post(`/client/${clientId}/v1/variables/var_key`, (body) => body.user_id === 'user1')
                        .matchHeader('Content-Type', 'application/json')
                        .matchHeader('authorization', 'dvc_server_test_token')
                        // SDK retries the request 5 times + 1 initial request
                        .times(6)
                        .reply(500)

                    const variableResponse = await callVariable(
                        clientId,
                        url,
                        userId,
                        'var_key',
                        variablesForTypes[type].defaultValue
                    )
                    const variable = await variableResponse.json()

                    expect(variable).toEqual(expect.objectContaining({
                        entityType: 'Variable',
                        data: {
                            key: 'var_key',
                            value: variablesForTypes[type].defaultValue,
                            isDefaulted: true,
                            defaultValue: variablesForTypes[type].defaultValue
                        }
                    }))
                })
            })
        })
    })
})

