import { 
    getConnectionStringForProxy, 
    forEachSDK, 
    describeIf, 
    createClient, 
    createUser, 
    callVariable, 
    callOnClientInitialized
} from '../helpers'
import { Capabilities, SDKCapabilities } from '../types'
import { v4 as uuidv4 } from 'uuid'
import { getServerScope } from '../mockServer'
import { config } from '../mockData/index'

jest.setTimeout(10000)

const scope = getServerScope()

describe('Variable Tests - Local', () => {
    const mockEvents = jest.fn()

    forEachSDK((name) => {
        let url: string
        const capabilities: string[] = SDKCapabilities[name]
        const clientId: string = uuidv4()
        const baseURL = `http://host.docker.internal:${global.__MOCK_SERVER_PORT__}/client/${clientId}`
        let variationOnUser: string, noVariationUser: string, invalidUser: string

        let resolveIsInitialized: (value: unknown) => void

        const isInitialized = new Promise(function(resolve,){
            resolveIsInitialized = resolve
        })
        
        beforeAll(async () => {
            url = getConnectionStringForProxy(name)  
            // create client          
            await createClient(url, clientId, 'dvc_server_test_token', {
                baseURLOverride: baseURL,
                eventFlushIntervalMS: 500
            })

            // create users
            variationOnUser = (
                await createUser(url, { user_id: 'user1', customData: { 'should-bucket': true } })
            ).headers.get('location')

            noVariationUser = (await createUser(url, { user_id: 'user3' })).headers.get('location')
            invalidUser = (await createUser(url, { name: 'invalid' })).headers.get('location')

            // mock endpoints
            scope
                .get(`/client/${clientId}/config/v1/server/dvc_server_test_token.json`)
                .reply(200, config)

            scope.post(`/client/${clientId}`).reply(function(uri, body) {
                if (typeof body === 'object' 
                    && body.message.includes('onClientInitialized was invoked')) resolveIsInitialized(true)
                return [200]
            })

            scope.persist().post(`/client/${clientId}/v1/events/batch`).reply(function(uri, body) {
                mockEvents(body)
                return [200]
            })
        })

        afterEach(() => {
            jest.clearAllMocks()
        })

        describeIf(capabilities.includes(Capabilities.local))(name, () => {
            describe('uninitialized client', () => {
                it('should return default value if client is uninitialized',  async () => {
                    const variableResponse = await callVariable(
                        clientId, url, variationOnUser, 'string-var', 'string default'
                    )
                    const variable = await variableResponse.json()
                    expectDefaultValue(variable, 'string default')
                })

                it('should return default value if user is invalid',  async () => {    
                    const variableResponse =
                        await callVariable( clientId, url, invalidUser, 'string-var', 'string default')
                    const variable = await variableResponse.json()
                    expectDefaultValue(variable, 'string default')
                })
            })

            describe('initialized client', () => {
                beforeAll(async () => {
                    const cbResponse = await callOnClientInitialized(clientId, url, baseURL)
                    await cbResponse.json()

                    await isInitialized
                })

                it('should return variable if mock server returns object matching default type',  async () => {
                    const variableResponse = await callVariable(
                        clientId, url, variationOnUser, 'string-var', 'default_val'
                    )
                    const variable = await variableResponse.json()
                    expect(variable.entityType).toBe('Variable')
                    expect(variable.data.value).toBe('string')
                    expect(variable.data.isDefaulted).toBe(false)
                    expect(variable.data.defaultValue).toBe('default_val')

                    await expectEventSent('user1', 'string-var', 'aggVariableEvaluated')
                })

                it('should throw exception if user is invalid',  async () => {    
                    const variableResponse =
                        await callVariable( clientId, url, invalidUser, 'string-var', 'string default')
                    const variable = await variableResponse.json()

                    expect(variable.exception).toBe('Must have a user_id set on the user')
                })

                it('should return default value if default type doesn\'t match variable type',  async () => {    
                    const variableResponse =
                        await callVariable(clientId, url, variationOnUser, 'bool-var', 'string default')
                    const variable = await variableResponse.json()

                    expectDefaultValue(variable, 'string default')                    
                    await expectEventSent(variationOnUser, 'bool-var', 'aggVariableEvaluated')

                    // TODO test that this logs a warning
                })

                it('should return default value if user is not bucketed into variable',  async () => {
                    const variableResponse =
                        await callVariable(clientId, url, noVariationUser, 'string-var', 'string default')
                    const variable = await variableResponse.json()

                    expectDefaultValue(variable, 'string default')                    
                    await expectEventSent(noVariationUser, 'string-var', 'aggVariableDefaulted')
                })

                it('should return default value if variable doesn\' exist',  async () => {
                    const variableResponse =
                        await callVariable(clientId, url, variationOnUser, 'nonexistent', 'string default')
                    const variable = await variableResponse.json()

                    expectDefaultValue(variable, 'string default')
                    await expectEventSent(variationOnUser, 'nonexistent', 'aggVariableDefaulted')
                })
            })
        })
    })

    const expectEventSent = async (userId: string, variableId: string, eventType: string) => {
        await new Promise((resolve) => {
            setTimeout(() => {
                resolve({})
            }, 1000)
        })
        expect(mockEvents).toHaveBeenCalledWith({
            batch: [{ 
                user: expect.objectContaining({
                    platform: 'NodeJS',
                    sdkType: 'server',
                    // user_id: userId
                }),
                events: [
                    expect.objectContaining({
                        type: eventType,
                        target: variableId,
                        value: 1,
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
        expect(variable.data.value).toBe(defaultValue)
        expect(variable.data.isDefaulted).toBe(true)
        expect(variable.data.defaultValue).toBe(defaultValue)
    }
})
