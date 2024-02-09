import Koa from 'koa'
import { DevCycleCloudClient, initializeDevCycle } from '@devcycle/js-cloud-server-sdk'
import { dataStore } from '../app'

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
        let client: DevCycleCloudClient

        if (!enableCloudBucketing) {
            throw new Error('Local bucketing is not supported in the JS Cloud Bucketing SDK')
        } else {
            client = initializeDevCycle(sdkKey, { ...options, enableCloudBucketing: true })
        }

        dataStore.clients[clientId] = client
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
