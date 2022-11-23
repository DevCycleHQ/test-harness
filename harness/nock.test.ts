import { getServerScope } from './mockServer'
import nock from 'nock'

const scope = getServerScope()

describe('nock', () => {
    it('intercepts requests', async () => {
        const clientId = '123'

        scope
            .put(`/client/${clientId}`, { yo: /.*/ })
            .matchHeader('Content-Type', 'application/json').times(2).reply(200, {
                goats: 'Never in a million years'
            })

        const result1 = await(await fetch(`http://localhost:${global.__MOCK_SERVER_PORT__}/client/${clientId}`, {
            method: 'put',
            body: JSON.stringify({
                yo: 's'
            }),
            headers: { 'Content-Type': 'application/json' }
        })).json()

        const result2 = await(await fetch(`http://localhost:${global.__MOCK_SERVER_PORT__}/client/${clientId}`, {
            method: 'put',
            body: JSON.stringify({
                yo: 'a'
            }),
            headers: { 'Content-Type': 'application/json' }
        })).json()

        expect(result1.goats).toBe('Never in a million years')
        expect(result2.goats).toBe('Never in a million years')

        expect(scope.isDone()).toBeTruthy()
    })
})
