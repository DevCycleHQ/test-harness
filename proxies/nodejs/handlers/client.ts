import Koa from 'koa'
import { DVCClient, DVCCloudClient, initialize } from '@devcycle/nodejs-server-sdk'
import { dataStore } from '../app'

type ClientRequestBody = {
    clientId: string
    sdkKey: string
    enableCloudBucketing: boolean
    options: { [key: string]: string }
}

export const handleClient = async (ctx: Koa.ParameterizedContext) => {
    const { clientId, sdkKey, enableCloudBucketing, options } = <ClientRequestBody>ctx.request.body
    if (clientId === undefined) {
        ctx.status = 400
        ctx.body = {
            message: 'Invalid request: missing clientId'
        }
        return ctx
    }
    try {
        dataStore.clients[clientId] = initialize(sdkKey, { ...options,  enableCloudBucketing })
        ctx.status = 201
        ctx.set('Location', `client/${clientId}`)
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
