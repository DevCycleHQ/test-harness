import { initialize } from '@devcycle/nodejs-server-sdk'
import Koa from 'koa'

async function start() {
    await initialize('<TOKEN>').onClientInitialized()

    const app = new Koa()

    app.use(async (ctx) => {
      ctx.body = 'Hello World'
    })

    // Server!
    console.log('Server started on port 3000')
    app.listen(3000)
}

start()


