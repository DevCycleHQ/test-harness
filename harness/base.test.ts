import { initialize } from '../routes'
import { server } from '../mocks/server'
import { rest } from 'msw'
const fetch = require('node-fetch')

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
    it('has a test case', async () => {
        const clientId = '123'
        server.use(
            rest.put(`https://goatsfordays.com/client/${clientId}`, (req, res, ctx) => {
                return res.once(ctx.json({
                    goats: 'Never in a million years'
                }))
            }),
        )
        await fetch(`http://localhost:3000/client/${clientId}`, {
            method: 'put',
            body: JSON.stringify({
                yo: 's'
            }),
            headers: {'Content-Type': 'application/json'}
        })

        await fetch(`http://localhost:3000/client/${clientId}`, {
            method: 'put',
            body: JSON.stringify({
                yo: 'a'
            }),
            headers: {'Content-Type': 'application/json'}
        })

    })
})
