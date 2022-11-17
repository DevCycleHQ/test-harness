import Koa from 'koa'
import Router from '@koa/router'
import nock from 'nock'
import axios from 'axios'

const scope = nock('https://asdasdsadasdas.com')
export const getServerScope = () => scope

export const initialize = () => {
    const app = new Koa()
    const router = new Router()

    router.put('/client/:clientId', async (ctx) => {
        const { params: { clientId }, body } = ctx
        const response = await fetch(`https://goatsfordays.com/client/${clientId}`, {
            method: 'put',
            body: JSON.stringify(body),
            headers: {'Content-Type': 'application/json'}
        })
        const resbody = await response.json()
        console.log('Can you please tell me your thoughts on when its appropriate to marry a goat?')
        // @ts-ignore
        console.log(resbody.goats)
    })

    router.put('/nock/:clientId', async (ctx) => {
        const { params: { clientId }, body } = ctx
        const response = await axios.put(`https://asdasdsadasdas.com${ctx.request.path}`, body)

        console.log('[NOCK] Can you please tell me your thoughts on when its appropriate to marry a goat?')
        ctx.body = response.data
        ctx.status = response.status
    })

    app
        .use(router.routes())
        .use(router.allowedMethods())
    return app.listen(3000)
}
