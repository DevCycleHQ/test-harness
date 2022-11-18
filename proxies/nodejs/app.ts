import { initialize } from '@devcycle/nodejs-server-sdk'
import Koa from 'koa'
import Router from 'koa-router'


async function start() {
    await initialize('<TOKEN>').onClientInitialized()

    const app = new Koa()

    var router = Router()
    router.get('/spec', (ctx) => {
      ctx.status = 200
      ctx.body = {
        name: "NodeJS",
        version: "", // TODO add branch name or sdk version here
        capabilities: ["EdgeDB", "LocalBucketing"],
      }
    })
    
    app.use(router.routes()).use(router.allowedMethods())

    // Server!
    console.log('Server started on port 3000')
    app.listen(3000)
}

start()


