import { getConnectionStringForProxy, forEachSDK, describeIf, createClient, createUser, wait } from '../helpers'
import { Capabilities, SDKCapabilities } from '../types'
import { v4 as uuidv4 } from 'uuid'
import nock from 'nock'
import { getServerScope } from '../nock'

jest.setTimeout(10000)

const scope = getServerScope()

describe('Client Initialize Tests - Cloud', () => {
    forEachSDK((name) => {
        let url: string
        const capabilities: string[] = SDKCapabilities[name]
        const mockServerUrl
            = `http://${process.env.DOCKER_HOST_IP ?? 'host.docker.internal'}:${global.__MOCK_SERVER_PORT__}`

        const clientOptions = {
            enableCloudBucketing: true,
        }

        beforeAll(async () => {
            url = getConnectionStringForProxy(name)
            const res = await fetch(`${url}/spec`)
            const response = await res.json()

            expect(response.name).toBeDefined()
            expect(response.capabilities).toBeDefined()
        })

        describeIf(capabilities.includes(Capabilities.cloud))(name, () => {

            it('should throw an exceptinon and return no location if invalid SDK token is sent', async () => {
                const clientId: string = uuidv4()
                const response = await createClient(url, clientId, 'invalidKey', clientOptions)
                const body = await response.json()
                expect(body.exception).toBe('Invalid environment key provided. Please call initialize with a valid server environment key')
                const createdClientId = response.headers.get('location')
                expect(createdClientId).toBeNull()
            })

            it('should throw an exceptinon and return no location if no SDK token is sent', async () => {
                const clientId: string = uuidv4()
                const response = await createClient(url, clientId, null, clientOptions)
                const body = await response.json()
                expect(body.exception).toBe('Missing environment key! Call initialize with a valid environment key')
                const createdClientId = response.headers.get('location')
                expect(createdClientId).toBeNull()
            })

            it('should return client object location if SDK token is correct', async () => {
                const clientId: string = uuidv4()
                const sdkKey = `dvc_server_${clientId}`
                const response = await createClient(url, clientId, sdkKey,
                    { ...clientOptions, baseURLOverride: `${mockServerUrl}/client/${clientId}` })

                const body = await response.json()
                expect(body.message).toBe('success')
            })
        })
    })
})

