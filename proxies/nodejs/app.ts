import { DVCClient } from '@devcycle/nodejs-server-sdk'
import Koa from 'koa'
import Router from 'koa-router'
import KoaBody  from 'koa-body'

const data = {
  clients: {},
  users: {},
  commandResults: {}
}

const handleClient = async (ctx) => {
  const body = ctx.request.body
  if (body.clientId === undefined) {
    ctx.status = 400 
    ctx.body = "Invalid request: Missing clientId"
  } else if (!body.sdkKey) {
    ctx.status = 400 
    ctx.body = "Invalid request: Missing sdkKey"
  } else {
    const client = new DVCClient(ctx.request.body.sdkKey, ctx.request.body.options)
    data.clients[ctx.request.body.clientId] = client
    await client.onClientInitialized()

    ctx.status = 200
  }
}

async function start() {
    const app = new Koa()
    app.use(KoaBody())

    var router = Router()

    router.get('/spec', (ctx) => {
      ctx.status = 200
      ctx.body = {
        name: "NodeJS",
        version: "", // TODO add branch name or sdk version here
        capabilities: ["EdgeDB", "LocalBucketing"],
      }
    })
    
    router.post('/client', handleClient)

    app.use(router.routes()).use(router.allowedMethods())

    // Server!
    console.log('Server started on port 3000')
    app.listen(3000)
}

start()
