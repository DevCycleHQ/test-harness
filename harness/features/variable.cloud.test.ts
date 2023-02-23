import {
    forEachSDK,
    forEachVariableType,
    variablesForTypes,
    CloudTestClient, describeCapability, expectErrorMessageToBe
} from '../helpers'
import { Capabilities } from '../types'
import { getServerScope } from '../nock'

// This is our proxy scope that is used to mock endpoints that are called in the SDK
const scope = getServerScope()

describe('Variable Tests - Cloud', () => {
    // This helper method enumerates all the SDKs and calls each test suite
    // for each SDK, and creates a test client from the name.
    // All supported SDKs can be found under harness/types/sdks.ts
    forEachSDK((name) => {
        let testClient: CloudTestClient

        beforeEach(async () => {
            testClient = new CloudTestClient(name)
            // Creating a client will pass to the proxy server by default:
            // - sdk key based on the client id created when creating the client
            // - urls for the bucketing/config/events endpoints to redirect traffic
            // into the proxy server so nock can mock out the responses
            // - options like should wait for initialization, or should
            // expect it to error out
            await testClient.createClient({
                enableCloudBucketing: true
            })
        })

        // This describeCapability only runs if the SDK has the "cloud" capability.
        // Capabilities are located under harness/types/capabilities and follow the same
        // name mapping from the sdks.ts file under harness/types/sdks.ts
        describeCapability(name, Capabilities.cloud)(name, () => {
            it('will throw error variable called with invalid key', async () => {
                // Helper method calls the proxy server to trigger the "variable" method in
                // the SDK
                const variableResponse = await testClient.callVariable(
                    { user_id: 'user1' },
                    null,
                    'default_value',
                    true
                )
                const error = await variableResponse.json()
                // Helper method to equate error messages from the error object returned
                // from the proxy server
                expectErrorMessageToBe(error.asyncError, 'Missing parameter: key')
            })
            // TODO DVC-5954 investigate why these were failing on the SDKs
            it.skip('will throw error if variable called with invalid sdk key', async () => {
                scope
                    .post(`/client/${testClient.clientId}/v1/variable/var_key`)
                    .reply(401, { message: 'Invalid sdk key' })

                // Helper method calls the proxy server to trigger the "variable" method in
                // the SDK
                const variableResponse = await testClient.callVariable(
                    { user_id: 'user1' },
                    'var_key',
                    'default_value',
                    true
                )
                const error = await variableResponse.json()
                // Helper method to equate error messages from the error object returned
                // from the proxy server
                expectErrorMessageToBe(error.asyncError, 'Invalid sdk key')
            })

            it('will throw error variable called with invalid default value', async () => {
                const variableResponse = await testClient.callVariable(
                    { user_id: 'user1' },
                    'var_key',
                    null,
                    true
                )

                const error = await variableResponse.json()
                expectErrorMessageToBe(error.asyncError, 'Missing parameter: defaultValue')
            })

            it('should call variables API without edgeDB option', async () => {
                // This allows us to mock out the our specific client (using the clientId),
                // allowing us to have multiple mock APIs serving different clients without
                // conflicting. We can match on specific criteria, like headers and the query params
                // to specify which call we want to mock, and reply with a status code and an object
                // as a response
                scope
                    .post(`/client/${testClient.clientId}/v1/variables/var_key`, (body) => body.user_id === 'user1')
                    .matchHeader('Content-Type', 'application/json')
                    .matchHeader('authorization', testClient.sdkKey)
                    .query((queryObj) => {
                        return !queryObj.enableEdgeDB
                    })
                    .reply(200, {
                        key: 'var_key',
                        value: 'value',
                        defaultValue: 'default_value',
                        type: 'String',
                        isDefaulted: false
                    })
                const variableResponse = await testClient.callVariable(
                    { user_id: 'user1' },
                    'var_key',
                    'default_value'
                )
                await variableResponse.json()
            })

            it('should call variables API with edgeDB option', async () => {
                const testClient = new CloudTestClient(name)

                // Some tests require extra params for startup, so we can just create a new test client
                // for these specific tests.
                await testClient.createClient({
                    enableCloudBucketing: true,
                    enableEdgeDB: true
                })

                scope
                    .post(`/client/${testClient.clientId}/v1/variables/var_key`, (body) => body.user_id === 'user1')
                    .matchHeader('Content-Type', 'application/json')
                    .matchHeader('authorization', testClient.sdkKey)
                    .query((queryObj) => {
                        return !!queryObj.enableEdgeDB
                    })
                    .reply(200, {
                        key: 'var_key',
                        value: 'value',
                        defaultValue: 'default_value',
                        type: 'String',
                        isDefaulted: false
                    })
                const variableResponse = await testClient.callVariable(
                    { user_id: 'user1' },
                    'var_key',
                    'default_value'
                )
                await variableResponse.json()
            })

            it('should return default if mock server\
            returns variable mismatching default value type', async () => {
                scope
                    .post(`/client/${testClient.clientId}/v1/variables/var_key`, (body) => body.user_id === 'user1')
                    .matchHeader('Content-Type', 'application/json')
                    .matchHeader('authorization', testClient.sdkKey)
                    .reply(200, {
                        key: 'var_key',
                        value: 5,
                        type: 'Number',
                        isDefaulted: false
                    })

                const variableResponse = await testClient.callVariable(
                    { user_id: 'user1' },
                    'var_key',
                    variablesForTypes['string'].defaultValue
                )
                const variable = await variableResponse.json()

                // We can expect that the object we mocked out earlier is going to be
                // what is returned to us from the proxy server and verify the entityType
                // is of type "Variable"
                expect(variable).toEqual(expect.objectContaining({
                    entityType: 'Variable',
                    data: {
                        key: 'var_key',
                        value: variablesForTypes['string'].defaultValue,
                        defaultValue: variablesForTypes['string'].defaultValue,
                        type: variablesForTypes['string'].type,
                        isDefaulted: true
                    }
                }))
            })

            // Instead of writing tests for each different type we support (String, Boolean, Number, JSON),
            // this function enumerates each type and runs all tests encapsulated within it to condense repeated tests.
            forEachVariableType((type) => {
                it(`should return default ${type} variable if mock server returns undefined`, async () => {
                    scope
                        .post(`/client/${testClient.clientId}/v1/variables/var_key`, (body) => body.user_id === 'user1')
                        .matchHeader('Content-Type', 'application/json')
                        .matchHeader('authorization', testClient.sdkKey)
                        .reply(200, undefined)

                    const variableResponse = await testClient.callVariable(
                        { user_id: 'user1' },
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
                            type: variablesForTypes[type].type,
                            isDefaulted: true
                        }
                    }))
                })

                it(`should return ${type} variable if mock server returns \
                proper variable matching default value type`, async () => {
                    scope
                        .post(`/client/${testClient.clientId}/v1/variables/var_key`, (body) => body.user_id === 'user1')
                        .matchHeader('Content-Type', 'application/json')
                        .matchHeader('authorization', testClient.sdkKey)
                        .reply(200, variablesForTypes[type])

                    const variableResponse = await testClient.callVariable(
                        { user_id: 'user1' },
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
                            isDefaulted: false,
                            type: variablesForTypes[type].type
                        }
                    }))
                })

                it(`should return defaulted ${type} variable if mock server returns an internal error, \
                after retrying 5 times`, async () => {
                    scope
                        .post(`/client/${testClient.clientId}/v1/variables/var_key`, (body) => body.user_id === 'user1')
                        .matchHeader('Content-Type', 'application/json')
                        .matchHeader('authorization', testClient.sdkKey)
                        // SDK retries the request 5 times + 1 initial request
                        .times(6)
                        .reply(500)

                    const variableResponse = await testClient.callVariable(
                        { user_id: 'user1' },
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
                            defaultValue: variablesForTypes[type].defaultValue,
                            type: variablesForTypes[type].type
                        }
                    }))
                })
            })
        })
    })
})
