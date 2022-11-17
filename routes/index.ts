import * as Koa from 'koa'
import * as Router from '@koa/router'
const fetch = require('node-fetch')
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
        ctx.body = await response.json()
    })
    app
        .use(async (ctx, next) => {
            console.log('DEFAULT MIDDLEWARE')
            await next()
        })
        .use(router.routes())
        .use(router.allowedMethods())
    return app.listen(3000)
}
