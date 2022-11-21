import { getConnectionStringForProxy, forEachSDK, describeIf } from './helpers'
import { Capabilities, SDKCapabilities } from './types'

jest.setTimeout(10000)

describe('generic proxy', () => {
    forEachSDK((name) => {
        let url: string
        let capabilities: string[] = SDKCapabilities[name]
        beforeAll(async () => {
            url = getConnectionStringForProxy(name)
            const res = await fetch(`${url}/spec`)
            const response = JSON.parse(await res.text())
        })

        describeIf(capabilities.includes(Capabilities.edgeDB))(name, () => {
            it('Will get called',  async () => {
                console.log('YEP')
            })
        })

        describeIf(capabilities.includes(Capabilities.sse))(name, () => {
            it('will never get called',  async () => {
                console.log('NOPE')
            })
        })
    })
})
