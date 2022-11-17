import { initialize } from '../routes'
import { server } from '../mocks/server'
import { rest } from 'msw'

describe('runs a test', () => {
    beforeAll(async () => {
        await initialize()
        console.log('initialized server')
        server.listen()
    })

    afterAll(() => {
        server.close()
    })
    beforeEach(() => {
        server.resetHandlers()
    })
    it('should reset to default response after first call', async () => {
        const clientId = '123'
        server.use(
            rest.put(`https://goatsfordays.com/client/${clientId}`, (req, res, ctx) => {
                return res.once(ctx.json({
                    goats: 'Never in a million years'
                }))
            }),
        )
        const res1 = await fetch(`http://localhost:3000/client/${clientId}`, {
            method: 'put',
            headers: {'Content-Type': 'application/json'}
        })
        const resbody1 = await res1.json()
        const res2 = await fetch(`http://localhost:3000/client/${clientId}`, {
            method: 'put',
            headers: {'Content-Type': 'application/json'}
        })
        const resbody2 = await res2.json()
        expect(resbody1.goats).toEqual('Never in a million years')
        expect(resbody2.goats).toEqual('always')
    })
})
