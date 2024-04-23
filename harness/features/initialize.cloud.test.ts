import {
    getConnectionStringForProxy,
    CloudTestClient,
    describeCapability,
    expectErrorMessageToBe,
    getSDKScope,
} from '../helpers'
import { Capabilities } from '../types'

describe('Client Initialize Tests - Cloud', () => {
    const { sdkName } = getSDKScope()

    let url: string
    beforeAll(async () => {
        url = getConnectionStringForProxy(sdkName)
        const res = await fetch(`${url}/spec`)
        const response = await res.json()

        expect(response.name).toBeDefined()
        expect(response.capabilities).toBeDefined()
    })

    describeCapability(sdkName, Capabilities.cloud)(sdkName, () => {
        it('should throw an exception and return no location if invalid SDK token is sent', async () => {
            const client = new CloudTestClient(sdkName)
            const response = await client.createClient({}, 'invalidKey', true)
            const body = await response.json()
            expectErrorMessageToBe(
                body.exception,
                'Missing environment key! Call initialize with a valid environment key',
                'Invalid SDK key provided. Call build with a valid server SDK key',
            )
            const createdClientId = response.headers.get('location')
            expect(createdClientId).toBeNull()
        })

        it('should throw an exception and return no location if no SDK token is sent', async () => {
            const client = new CloudTestClient(sdkName)
            const response = await client.createClient({}, null, true)
            const body = await response.json()
            expectErrorMessageToBe(
                body.exception,
                'Missing environment key! Call initialize with a valid environment key',
                'Missing SDK key! Call build with a valid server SDK key',
            )
            const createdClientId = response.headers.get('location')
            expect(createdClientId).toBeNull()
        })

        it('should return client object location if SDK token is correct', async () => {
            const client = new CloudTestClient(sdkName)
            const response = await client.createClient({})
            const body = await response.json()
            expect(body.message).toBe('success')
        })
    })
})
