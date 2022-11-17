import { getServerScope, initialize } from './routes'
import nock from 'nock'

const scope = getServerScope()

describe('nock', () => {
    let server
    beforeAll(async () => {
        server = await initialize()
    })

    afterAll(() => {
        server.close()
    })

    it('intercepts requests', async () => {
        const clientId = '123'

        scope.put(`/nock/${clientId}`).times(3).reply(200, {
            goats: 'Never in a million years'
        })

         const result = await fetch(`http://localhost:3000/nock/${clientId}`, {
            method: 'put',
            body: JSON.stringify({
                yo: 's'
            }),
            headers: {'Content-Type': 'application/json'}
        })

        const result2 = await fetch(`http://localhost:3000/nock/${clientId}`, {
            method: 'put',
            body: JSON.stringify({
                yo: 'a'
            }),
            headers: {'Content-Type': 'application/json'}
        })

        console.log(await result.json())
        console.log(await result2.json())

        scope.isDone()
    })
})
