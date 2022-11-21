import {Capabilities, Sdks} from '../../types'
import { DVCClient, initialize } from '@devcycle/nodejs-server-sdk'
import Koa from 'koa'
import Router from 'koa-router'
import bodyParser from 'koa-bodyparser'
const data = {
  clients: {},
  users: {},
  commandResults: {}
}

const handleClient = async (ctx) => {
  const body = ctx.request.body
  if (body.clientId === undefined) {
    ctx.status = 400
    ctx.body = "Invalid request: missing clientId"
  } else {
    const client = initialize(body.sdkKey, body.options)
    data.clients[body.clientId] = client
    ctx.status = 201
    ctx.set('Location',`client/${body.clientId}`)
  }
}

async function start() {
    const app = new Koa()
    app.use(bodyParser())

    var router = Router()

    router.get('/spec', (ctx) => {
      ctx.status = 200
      ctx.body = {
        name: Sdks.nodejs,
        version: "", // TODO add branch name or sdk version here
        capabilities: [Capabilities.edgeDB, Capabilities.local],
      }
    })

    router.post('/client', handleClient)

    app.use(router.routes()).use(router.allowedMethods())

    // Server!
    console.log('Server started on port 3000')
    app.listen(3000)
}

start()
