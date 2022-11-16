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
        const resbody = await response.json()
        console.log('Can you please tell me your thoughts on when its appropriate to marry a goat?')
        // @ts-ignore
        console.log(resbody.goats)
    })
    app
        .use(router.routes())
        .use(router.allowedMethods())
    return app.listen(3000)
}
