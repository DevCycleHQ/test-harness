import Koa from 'koa'
import { DevCycleProvider } from '@devcycle/nodejs-server-sdk'
import { dataStore } from '../app'
import { OpenFeature } from '@openfeature/server-sdk'
import Router from '@koa/router'

type ClientRequestBody = {
    clientId: string
    sdkKey: string
    enableCloudBucketing?: boolean
    waitForInitialization?: boolean
    options: { [key: string]: string }
}

type State = any
type Context = Koa.DefaultContext & {
    request: Koa.Request & { body: ClientRequestBody }
}

export const handleClient: Router.IMiddleware<State, Context> = async (ctx) => {
    const { clientId, sdkKey, enableCloudBucketing, options } = ctx.request.body

    if (clientId === undefined) {
        ctx.status = 400
        ctx.body = { message: 'Invalid request: missing clientId' }
        return ctx
    }

    try {
        let asyncError
        const dvcProvider = new DevCycleProvider(sdkKey, {
            ...options,
            enableCloudBucketing,
            disableRealTimeUpdates: true,
        })

        try {
            await OpenFeature.setProviderAndWait(dvcProvider)
        } catch (e) {
            asyncError = e
        }
        const openFeatureClient = OpenFeature.getClient()

        if (asyncError) {
            ctx.status = 200
            ctx.body = { exception: asyncError.message }
        } else {
            dataStore.clients[clientId] = {
                dvcClient: dvcProvider.devcycleClient,
                openFeatureClient,
            }
            ctx.status = 201
            ctx.set('Location', `client/${clientId}`)
            ctx.body = { message: 'success' }
        }
    } catch (error) {
        ctx.status = 200
        ctx.body = { exception: error.message }
    }
}
