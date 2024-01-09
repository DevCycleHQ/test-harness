import Koa from 'koa'
import {
    DevCycleClient, DevCycleCloudClient, DevCycleOptions, initializeDevCycle
} from '@devcycle/nodejs-server-sdk'
import { dataStore } from '../app'
import DevCycleProvider from '@devcycle/openfeature-nodejs-provider'
import { OpenFeature } from '@openfeature/server-sdk'

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
        let dvcClient: DevCycleClient | DevCycleCloudClient
        let dvcOptions: DevCycleOptions

        if (!enableCloudBucketing) {
            dvcOptions = { ...options }
            dvcClient = initializeDevCycle(sdkKey, dvcOptions)
            if (waitForInitialization && dvcClient instanceof DevCycleClient) {
                try {
                    await dvcClient.onClientInitialized()
                } catch (e) {
                    asyncError = e
                }
            }

        } else {
            dvcClient = initializeDevCycle(sdkKey, { ...options, enableCloudBucketing: true })
        }

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
