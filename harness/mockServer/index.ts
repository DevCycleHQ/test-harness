import Koa from 'koa'
import Router from '@koa/router'
import axios from 'axios'
import bodyParser from 'koa-bodyparser'
import SseStream from 'ssestream'

// NOTE: This file is excecuted by the jest environment, which does not share a memory space / module cache with the
// jest test files. This means that any things you want to be able to access from test context
// (like the unmatchedRequests) will need to be bound to the global scope inside the jest-environment and accessed
// through that

let unmatchedRequests = []
export const sseStreams: Map<string, SseStream> = new Map()
export const assertNoUnmatchedRequests = async (
    currentClientId,
    testNameMap,
) => {
    if (unmatchedRequests.length > 0) {
        const currentUnmatchedRequests = unmatchedRequests
        unmatchedRequests = []
        const url = currentUnmatchedRequests[0].config.url
        const clientId = url.split('/')[4]

        if (url.includes(currentClientId)) {
            console.error('Unmatched requests: ' + currentUnmatchedRequests)
            throw new Error(
                'Unexpected requests received: ' + currentUnmatchedRequests,
            )
        } else {
            const testName = testNameMap[clientId]
            console.error(
                `Unmatched requests from test case ${testName} ` +
                currentUnmatchedRequests,
            )
            throw new Error(
                `Unexpected requests received from test case ${testName} ` +
                currentUnmatchedRequests,
            )
        }
    }
}

export function initialize() {
    const app = new Koa()
    const router = new Router()

    router.param('clientId', (clientId, ctx, next) => {
        ctx.clientId = clientId
        return next()
    }).all('/client/:clientId/sse', async (ctx) => {
        console.log(ctx.body)
        let sseStream = sseStreams[ctx.clientId]
        if (!sseStream) {
            sseStream = new SseStream(ctx.req)
            sseStreams[ctx.clientId] = sseStream
        }
        sseStream.pipe(ctx.res)
        ctx.res.on('close', () => {
            sseStream.unpipe(ctx.res)
        })
    })
    router.all('/(.*)', async (ctx) => {
        const { headers, request } = ctx

        if (process.env.LOG_LEVEL === 'debug') {
            console.log(
                'Forwarding Request to Nock Server: ',
                request.method,
                ctx.request.url,
            )
        }

        try {
            let response: any
            if (request.method.toLowerCase() === 'get') {
                response = await axios.get(
                    `https://myfakenockurl${ctx.request.url}`,
                    {
                        headers,
                    },
                )
            } else {
                response = await axios[request.method.toLowerCase()](
                    `https://myfakenockurl${ctx.request.url}`,
                    ctx.request.body,
                    {
                        headers,
                    },
                )
            }
            ctx.body = response.data
            ctx.status = response.status
            for (const header in response.headers) {
                ctx.set(header, response.headers[header])
            }
        } catch (error) {
            if (error.response) {
                ctx.body = error.response.data
                ctx.status = error.response.status
            } else {
                console.log(
                    'Error Forwarding Request to Nock Server: ',
                    error.message,
                )
                unmatchedRequests.push(error)
            }
        }
    })

    app.use(bodyParser()).use(router.routes()).use(router.allowedMethods())

    return app.listen(0)
}
