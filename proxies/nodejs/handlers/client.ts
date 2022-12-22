import Koa from 'koa'
import { DVCClient, DVCCloudClient, initialize } from '@devcycle/nodejs-server-sdk'
import { dataStore } from '../app'

type ClientRequestBody = {
    clientId: string
    sdkKey: string
    enableCloudBucketing?: boolean
    waitForInitialization?: boolean
    options: { [key: string]: string }
}

export const handleClient = async (ctx: Koa.ParameterizedContext) => {
    const { clientId, sdkKey, enableCloudBucketing, waitForInitialization, options } = <ClientRequestBody>ctx.request.body
    if (clientId === undefined) {
        ctx.status = 400
        ctx.body = {
            message: 'Invalid request: missing clientId'
        }
        return ctx
    }
    try {
        let asyncError
        let client: DVCClient | DVCCloudClient
        if (!enableCloudBucketing) {
            client = initialize(sdkKey, { ...options })
            if (waitForInitialization) {
                try {
                    await client.onClientInitialized()
                } catch (e) {
                    asyncError = e
                }
            }
        } else {
            client = initialize(sdkKey, { ...options, enableCloudBucketing: true })
        }
        dataStore.clients[clientId] = client
        ctx.status = 201
        ctx.set('Location', `client/${clientId}`)

        if (asyncError) {
            ctx.status = 201
            ctx.body = {
                asyncError: asyncError.message
            }
        } else {
            ctx.body = {
                message: 'success'
            }
        }
    } catch (error) {
        ctx.status = 200
        ctx.body = {
            exception: error.message
        }
    }
}
