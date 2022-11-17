import { getConnectionStringForProxy } from './helpers'

jest.setTimeout(10000)

describe('nodejs proxy', () => {
    let url: string
    beforeAll(() => {
        url = getConnectionStringForProxy('nodejs')

    })
    it('receives requests from harness',  async () => {
        console.log("testing connection to ", url)
        const res = await fetch(url)
        const response = await res.text()
        expect(response).toEqual('Hello World')
    })
})
