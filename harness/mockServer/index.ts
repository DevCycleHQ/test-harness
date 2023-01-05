import Koa from 'koa'
import Router from '@koa/router'
import axios from 'axios'
import bodyParser from 'koa-bodyparser'

// NOTE: This file is excecuted by the jest environment, which does not share a memory space / module cache with the
// jest test files. This means that any things you want to be able to access from test context
// (like the unmatchedRequests) will need to be bound to the global scope inside the jest-environment and accessed
// through that

let unmatchedRequests = []

export const assertNoUnmatchedRequests = async () => {
    if (unmatchedRequests.length > 0) {
        const currentUnmatchedRequests = unmatchedRequests
        unmatchedRequests = []
        throw new Error('Unmatched requests: ' + currentUnmatchedRequests)
    }
}

export function initialize() {
    const app = new Koa()
    const router = new Router()

    router.all('/(.*)', async (ctx) => {
        const { headers, request } = ctx
        try {
            const response = await axios[request.method.toLowerCase()](`https://myfakenockurl${ctx.request.url}`,
                request.body,
                {
                    headers
                })
            ctx.body = response.data
            ctx.status = response.status
        } catch (error) {
            if (error.response) {
                ctx.body = error.response.data
                ctx.status = error.response.status
            } else {
                console.log('Error Forwarding Request to Nock Server: ', error.message)
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
