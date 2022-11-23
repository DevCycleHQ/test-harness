import Koa from 'koa'
import { DVCClient, initialize } from '@devcycle/nodejs-server-sdk'
import { dataStore } from '../app'
type ClientRequestBody = {
    clientId: string
    sdkKey: string
    options: { [key: string]: string }
}

export const handleClient = async (ctx: Koa.ParameterizedContext) => {
    const body = <ClientRequestBody>ctx.request.body
    if (body.clientId === undefined) {
        ctx.status = 400
        ctx.body = {
            error: 'Invalid request: missing clientId'
        }
        return ctx
    }
    try {
        dataStore.clients[body.clientId] = initialize(body.sdkKey, body.options)
        ctx.status = 201
        ctx.set('Location', `client/${body.clientId}`)
        ctx.body = {
            message: 'success'
        }
    } catch (error) {
        ctx.status = 200
        ctx.body = {
            exception: error.message
        }
    }
}
