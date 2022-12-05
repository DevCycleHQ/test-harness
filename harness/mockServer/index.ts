import Koa from 'koa'
import Router from '@koa/router'
import nock from 'nock'
import axios from 'axios'
import bodyParser from 'koa-bodyparser'

const scope = nock('https://nock.com')
export const getServerScope = () => scope

export const initialize = () => {
    const app = new Koa()
    const router = new Router()

    router.all('/(.*)', async (ctx) => {
        const { headers, request } = ctx
        try {
            const response = await axios[request.method.toLowerCase()](`https://nock.com${ctx.request.url}`,
                request.body, {
                    headers
                })
            ctx.body = response.data
            ctx.status = response.status
        } catch (error) {
            if (error.response) {
                ctx.body = error.response.data
                ctx.status = error.response.status
            } else if (error.request) {
                console.log(error.request);
            } else {
                console.log('Error', error.message);
            }
        }
    })

    app
        .use(bodyParser())
        .use(router.routes())
        .use(router.allowedMethods())

    return app.listen(0)
}
