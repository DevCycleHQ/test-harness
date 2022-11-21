import { getConnectionStringForProxy } from './helpers'

jest.setTimeout(10000)

describe('nodejs proxy', () => {
    let url: string
    beforeAll(() => {
        url = getConnectionStringForProxy('nodejs')

    })
    it('receives requests from harness spec endpoint',  async () => {
        const res = await fetch(`${url}/spec`)
        const response = JSON.parse(await res.text())
        expect(response.name).toEqual('NodeJS')
        expect(response.capabilities).toEqual(['EdgeDB', 'LocalBucketing'])
    })
})
