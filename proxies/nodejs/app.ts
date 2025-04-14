import Koa from 'koa'
import Router from '@koa/router'
import bodyParser from '@koa/bodyparser'
import { handleClient } from './handlers/client'
import {
    handleLocation,
    validateLocationReqMiddleware,
} from './handlers/location'
import { DataStore } from './entityTypes'

type State = any
type Context = Koa.DefaultContext

export const dataStore: DataStore = { clients: {}, commandResults: {} }

async function start() {
    const app = new Koa<State, Context>()
    app.use(bodyParser())

    const router = new Router<State, Context>()

    router.get('/spec', async (ctx) => {
        ctx.status = 200
        ctx.body = {
            name: 'NodeJS',
            version: '', // TODO add branch name or sdk version here
            capabilities: ['EdgeDB', 'LocalBucketing'],
        }
    })

    router.post('/client', handleClient)
    router.post('/:location*', validateLocationReqMiddleware, handleLocation)

    app.use(router.routes())
    app.use(router.allowedMethods())

    // Server!
    console.log('Server started on port 3000')
    app.listen(3000)
}

start()
