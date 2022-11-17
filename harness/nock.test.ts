import { getServerScope } from './mockServer'
import nock from 'nock'

const scope = getServerScope()

describe('nock', () => {
   it('intercepts requests', async () => {
        const clientId = '123'

        scope.put(`/client/${clientId}`).matchHeader('Content-Type', 'application/json').times(2).reply(200, {
            goats: 'Never in a million years'
        })

         const result = await fetch(`http://localhost:${global.__MOCK_SERVER_PORT__}/client/${clientId}`, {
            method: 'put',
            body: JSON.stringify({
                yo: 's'
            }),
            headers: {'Content-Type': 'application/json'}
        })

        const result2 = await fetch(`http://localhost:${global.__MOCK_SERVER_PORT__}/client/${clientId}`, {
            method: 'put',
            body: JSON.stringify({
                yo: 'a'
            }),
            headers: {'Content-Type': 'application/json'}
        })

        console.log(await result.json())
        console.log(await result2.json())

        expect(scope.isDone()).toBeTruthy()
    })
})
