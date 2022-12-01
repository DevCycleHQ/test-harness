import { 
    getConnectionStringForProxy, 
    forEachSDK, 
    describeIf, 
    createClient, 
    createUser, 
    callVariable, 
    callOnClientInitialized,
    forEachVariableType
} from '../helpers'
import { Capabilities, SDKCapabilities } from '../types'
import { v4 as uuidv4 } from 'uuid'
import { getServerScope } from '../mockServer'
import { config } from '../mockData/index'

jest.setTimeout(10000)

const scope = getServerScope()

const expectedVariablesByType = {
    // these should match the config in mockData
    string: {
        key: 'string-var',
        id: '638681f059f1b81cc9e6c7fb',
        defaultValue: 'default_value',
        variationOn: 'string',
        variationOff: 'string-off'
    },
    number: {
        key: 'number-var',
        id: '638681f059f1b81cc9e6c7fc', 
        defaultValue: 0,
        variationOn: 1,
        variationOff: 2
    },
    boolean: {
        key: 'bool-var',
        id: '638681f059f1b81cc9e6c7fa',
        defaultValue: false,
        variationOn: true,
        variationOff: false
    },
    JSON: {
        key: 'json-var',
        id: '638681f059f1b81cc9e6c7fd',
        defaultValue: {},
        variationOn: {
            'facts': true
        },
        variationOff: {
            'facts': false
        }
    }
}

describe('Variable Tests - Local', () => {
    forEachSDK((name) => {
        let url: string
        const capabilities: string[] = SDKCapabilities[name]
        const clientId: string = uuidv4()
        const mockServerUrl 
            = `http://${process.env.DOCKER_HOST_IP ?? 'host.docker.internal'}:${global.__MOCK_SERVER_PORT__}`

        const baseURL = `${mockServerUrl}/client/${clientId}`
        const variationOnUser = { location: '', user_id: 'user1' }
        const noVariationUser = { location: '', user_id: 'user3' }
        const invalidUser = { location: '', user_id: '' }
        
        beforeAll(async () => {
            url = getConnectionStringForProxy(name)  
            // create client          
            await createClient(url, clientId, 'dvc_server_test_token', {
                baseURLOverride: baseURL,
                eventFlushIntervalMS: 500
            })

            // create users
            variationOnUser.location = (
                await createUser(url, { user_id: variationOnUser.user_id, customData: { 'should-bucket': true } })
            ).headers.get('location')

            noVariationUser.location = (
                await createUser(url, { user_id: noVariationUser.user_id })
            ).headers.get('location')

            invalidUser.location = (
                await createUser(url, { name: 'invalid' })
            ).headers.get('location')
        })

        describeIf(capabilities.includes(Capabilities.local))(name, () => {
            describe('uninitialized client', () => {
                it('should return default value if client is uninitialized',  async () => {
                    const variableResponse = await callVariable(
                        clientId, url, variationOnUser.location, 'string-var', 'string default'
                    )
                    const variable = await variableResponse.json()
                    expectDefaultValue(variable, 'string default')
                })

                it('should return default value if user is invalid',  async () => {    
                    const variableResponse =
                        await callVariable( clientId, url, invalidUser.location, 'string-var', 'string default')
                    const variable = await variableResponse.json()
                    expectDefaultValue(variable, 'string default')
                })
            })

            describe('initialized client', () => {
                beforeAll(async () => {
                    // mock endpoints
                    scope
                        .get(`/client/${clientId}/config/v1/server/dvc_server_test_token.json`)
                        .reply(200, config)

                    let resolveIsInitialized: (value: unknown) => void

                    const isInitialized = new Promise(function(resolve){
                        resolveIsInitialized = resolve
                    })
            
                    scope.post(`/client/${clientId}`).reply(function(uri, body) {
                        if (typeof body === 'object' 
                         && body.message.includes('onClientInitialized was invoked')) resolveIsInitialized(true)
                        return [200]
                    })

                    // wait until initialized
                    await callOnClientInitialized(clientId, url, baseURL)
                    await isInitialized
                })

                it('should throw exception if user is invalid',  async () => {    
                    const variableResponse =
                        await callVariable( clientId, url, invalidUser.location, 'string-var', 'string default')
                    const variable = await variableResponse.json()

                    expect(variable.exception).toBe('Must have a user_id set on the user')
                })

                forEachVariableType((type) => {
                    const { key, defaultValue, variationOn } = expectedVariablesByType[type]

                    it('should return variable if mock server returns object matching default type',  async () => {
                        let eventBody = {}
                        scope.post(`/client/${clientId}/v1/events/batch`).reply((uri, body) => {
                            eventBody = body
                            return [200]
                        })
                    
                        const variableResponse = await callVariable(
                            clientId, 
                            url, 
                            variationOnUser.location, 
                            key, 
                            defaultValue
                        )
                        const variable = await variableResponse.json()
                        expect(variable.entityType).toBe('Variable')
                        expect(JSON.stringify(variable.data.value)).toBe(JSON.stringify(variationOn))
                        expect(variable.data.isDefaulted).toBe(false)
                        expect(JSON.stringify(variable.data.defaultValue)).toBe(JSON.stringify(defaultValue))

                        await waitForEvent()
                        expectEventBody(eventBody, key, 'aggVariableEvaluated')
                    })

                    it('should return default value if default type doesn\'t match variable type',  async () => {
                        let eventBody = {}
                        scope.post(`/client/${clientId}/v1/events/batch`).reply((uri, body) => {
                            eventBody = body
                            return [200]
                        })

                        const wrongTypeDefault = type === 'number' ? '1' : 1
                        const variableResponse =
                            await callVariable(
                                clientId, 
                                url, 
                                variationOnUser.location, 
                                key, 
                                wrongTypeDefault
                            )
                        const variable = await variableResponse.json()
    
                        expectDefaultValue(variable, wrongTypeDefault)    
                        await waitForEvent()
                        expectEventBody(eventBody, key, 'aggVariableEvaluated')               
                    })

                    it('should return default value if user is not bucketed into variable',  async () => {
                        let eventBody = {}
                        scope.post(`/client/${clientId}/v1/events/batch`).reply((uri, body) => {
                            eventBody = body
                            return [200]
                        })
                        const variableResponse = await callVariable(
                            clientId, 
                            url, 
                            noVariationUser.location, 
                            key, 
                            defaultValue
                        )
                        const variable = await variableResponse.json()
    
                        expectDefaultValue(variable, defaultValue)                    
                        await waitForEvent()
                        expectEventBody(eventBody, key, 'aggVariableDefaulted')
                    })
    
                    it('should return default value if variable doesn\' exist',  async () => {
                        let eventBody = {}
                        scope.post(`/client/${clientId}/v1/events/batch`).reply((uri, body) => {
                            eventBody = body
                            return [200]
                        })

                        const variableResponse = await callVariable(
                            clientId, 
                            url, 
                            variationOnUser.location, 
                            'nonexistent', 
                            defaultValue
                        )
                        const variable = await variableResponse.json()
    
                        expectDefaultValue(variable, defaultValue)
                        await waitForEvent()
                        expectEventBody(eventBody, 'nonexistent', 'aggVariableDefaulted')
                    })

                    it('should aggregate aggVariableDefaulted events',  async () => {
                        let eventBody = {}
                        scope.post(`/client/${clientId}/v1/events/batch`).reply((uri, body) => {
                            eventBody = body
                            return [200]
                        })

                        await callVariable(
                            clientId, 
                            url, 
                            variationOnUser.location, 
                            'nonexistent', 
                            defaultValue
                        )
                        await callVariable(
                            clientId, 
                            url, 
                            variationOnUser.location, 
                            'nonexistent', 
                            defaultValue
                        )
    
                        await waitForEvent()
                        expectEventBody(eventBody, 'nonexistent', 'aggVariableDefaulted', 2)
                    })

                    it('should aggregate aggVariableEvaluated events',  async () => {
                        let eventBody = {}
                        scope.post(`/client/${clientId}/v1/events/batch`).reply((uri, body) => {
                            eventBody = body
                            return [200]
                        })

                        await callVariable(
                            clientId, 
                            url, 
                            variationOnUser.location, 
                            key, 
                            defaultValue
                        )
                        await callVariable(
                            clientId, 
                            url, 
                            variationOnUser.location, 
                            key, 
                            defaultValue
                        )
    
                        await waitForEvent()
                        expectEventBody(eventBody, key, 'aggVariableEvaluated', 2)
                    })
                })
            })
        })
    })

    const waitForEvent = async () => {
        await new Promise((resolve) => {
            setTimeout(() => {
                resolve({})
            }, 550)
        })
        expect(scope.isDone()).toBeTruthy()      
    }

    const expectEventBody = (
        body: Record<string, unknown>, 
        variableId: string, 
        eventType: string,
        value?: number
    ) => {
        expect(body).toMatchObject({
            batch: [{ 
                user: expect.objectContaining({
                    platform: 'NodeJS',
                    sdkType: 'server',
                }),
                events: [
                    expect.objectContaining({
                        type: eventType,
                        target: variableId,
                        value: value !== undefined ? value : 1,
                    })
                ]
            }]
        })
    }

    type ValueTypes = string | boolean | number | JSON

    type VariableResponse = {
        entityType: string,
        data: {
            value: ValueTypes,
            isDefaulted: boolean,
            defaultValue: ValueTypes
        }
    }
    
    const expectDefaultValue = (variable: VariableResponse, defaultValue: ValueTypes) => {
        expect(variable.entityType).toBe('Variable')
        expect(JSON.stringify(variable.data.value)).toBe(JSON.stringify(defaultValue))
        expect(variable.data.isDefaulted).toBe(true)
        expect(JSON.stringify(variable.data.defaultValue)).toBe(JSON.stringify(defaultValue))
    }
})
