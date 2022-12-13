import {
    getConnectionStringForProxy,
    forEachSDK,
    describeIf,
    CloudTestClient
} from '../helpers'
import { Capabilities, SDKCapabilities } from '../types'

jest.setTimeout(10000)

describe('Client Initialize Tests - Cloud', () => {
    forEachSDK((name) => {
        let url: string
        const capabilities: string[] = SDKCapabilities[name]

        beforeAll(async () => {
            url = getConnectionStringForProxy(name)
            const res = await fetch(`${url}/spec`)
            const response = await res.json()

            expect(response.name).toBeDefined()
            expect(response.capabilities).toBeDefined()
        })

        describeIf(capabilities.includes(Capabilities.cloud))(name, () => {

            it('should throw an exception and return no location if invalid SDK token is sent', async () => {
                const client = new CloudTestClient(name)
                const response = await client.createClient({}, 'invalidKey')
                const body = await response.json()
                expect(body.exception).toBe('Invalid environment key provided. Please call initialize with a valid server environment key')
                const createdClientId = response.headers.get('location')
                expect(createdClientId).toBeNull()
            })

            it('should throw an exception and return no location if no SDK token is sent', async () => {
                const client = new CloudTestClient(name)
                const response = await client.createClient({}, null)
                const body = await response.json()
                expect(body.exception).toBe('Missing environment key! Call initialize with a valid environment key')
                const createdClientId = response.headers.get('location')
                expect(createdClientId).toBeNull()
            })

            it('should return client object location if SDK token is correct', async () => {
                const client = new CloudTestClient(name)
                const response = await client.createClient({})
                const body = await response.json()
                expect(body.message).toBe('success')
            })
        })
    })
})

