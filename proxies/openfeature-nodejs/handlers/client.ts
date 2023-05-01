import Koa from 'koa'
import { DVCClient, DVCCloudClient, DVCOptions, initialize } from '@devcycle/nodejs-server-sdk'
import { dataStore } from '../app'
import DevCycleProvider from '@devcycle/openfeature-nodejs-provider'
import { OpenFeature } from '@openfeature/js-sdk'

type ClientRequestBody = {
    clientId: string
    sdkKey: string
    enableCloudBucketing?: boolean
    waitForInitialization?: boolean
    options: { [key: string]: string }
}

export const handleClient = async (ctx: Koa.ParameterizedContext) => {
    const {
        clientId,
        sdkKey,
        enableCloudBucketing,
        waitForInitialization,
        options
    } = <ClientRequestBody>ctx.request.body

    if (clientId === undefined) {
        ctx.status = 400
        ctx.body = {
            message: 'Invalid request: missing clientId'
        }
        return ctx
    }

    try {
        let asyncError
        let dvcClient: DVCClient | DVCCloudClient
        let dvcOptions: DVCOptions

        if (!enableCloudBucketing) {
            dvcOptions = { ...options }
            dvcClient = initialize(sdkKey, dvcOptions)
            if (waitForInitialization && dvcClient instanceof DVCClient) {
                try {
                    await dvcClient.onClientInitialized()
                } catch (e) {
                    asyncError = e
                }
            }

        } else {
            dvcClient = initialize(sdkKey, { ...options, enableCloudBucketing: true })
        }

        // @ts-ignore
        OpenFeature.setProvider(new DevCycleProvider(dvcClient, dvcOptions))
        const openFeatureClient = OpenFeature.getClient()

        dataStore.clients[clientId] = { dvcClient, openFeatureClient }
        ctx.status = 201
        ctx.set('Location', `client/${clientId}`)

        if (asyncError) {
            ctx.body = { asyncError: asyncError.message }
        } else {
            ctx.body = { message: 'success' }
        }
    } catch (error) {
        ctx.status = 200
        ctx.body = { exception: error.message }
    }
}
