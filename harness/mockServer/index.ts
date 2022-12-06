import Koa from 'koa'
import Router from '@koa/router'
import nock from 'nock'
import axios from 'axios'
import bodyParser from 'koa-bodyparser'

const scope = nock('https://nock.com')
export const getServerScope = () => scope

let unmatchedRequests = []

export const assertNoUnmatchedRequests = async () => {
    if (unmatchedRequests.length > 0) {
        unmatchedRequests = []
        throw new Error('Unmatched requests: ' + unmatchedRequests)
    }
}

export function initialize() {
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
            } else {
                console.log('Error', error.message);
                unmatchedRequests.push(error)
            }
        }
    })

    app
        .use(bodyParser())
        .use(router.routes())
        .use(router.allowedMethods())

    return app.listen(0)
}
