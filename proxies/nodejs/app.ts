import { DVCClient, DVCUser } from '@devcycle/nodejs-server-sdk'
import Koa from 'koa'
import Router from 'koa-router'
import bodyParser from 'koa-bodyparser'
import { handleUser } from './handlers/user'
import { handleClient } from './handlers/client'

type Data = {
  clients: { [key: string]: DVCClient }
  users: { [key: string]: DVCUser }
  commandResults: { [key: string]: any }
}

const data: Data = {
    clients: {},
    users: {},
    commandResults: {}
}

async function start() {
    const app = new Koa()
    app.use(bodyParser())

    const router = new Router()

    router.get('/spec', (ctx) => {
        ctx.status = 200
        ctx.body = {
            name: 'NodeJS',
            version: '', // TODO add branch name or sdk version here
            capabilities: ['EdgeDB', 'LocalBucketing'],
        }
    })

    router.post('/client', (ctx: Koa.ParameterizedContext) => {
        handleClient(ctx, data.clients)
    })
    router.post('/user', (ctx: Koa.ParameterizedContext) => {
        handleUser(ctx, data.users)
    })

    app.use(router.routes()).use(router.allowedMethods())

    // Server!
    console.log('Server started on port 3000')
    app.listen(3000)
}

start()
