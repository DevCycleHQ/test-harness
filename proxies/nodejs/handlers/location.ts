import { DVCClient, DVCUser, DVCVariable } from '@devcycle/nodejs-server-sdk'
import Koa from 'koa'
import { getEntityFromType, Data } from '../entityTypes'

//HTTP request comes in as string
type LocationRequestBody = {
    command: string
    params: string //[{value: string | number | boolean} | {location: string} | {callbackUrl: string}] 
    isAsync: boolean
}

type parsedParams = (string | boolean | number | object)[];

export const handleLocation = async (
    ctx: Koa.ParameterizedContext,
    data: Data,
    body: LocationRequestBody,
    entity: DVCClient | DVCUser | DVCVariable | any
) => {

    try {
        const command = body.command
        const params: parsedParams = parseParams(
            JSON.parse(body.params),
            data
        )

        // TODO: handle async commands
        // TODO: handle callback before invoking command
        const resultData = await invokeCommand(
            entity,
            command,
            params,
            body.isAsync
        )

        const entityType = getEntityFromType(resultData.constructor.name)

        const commandId = data.commandResults[entityType.toLowerCase()] !== undefined ?
            Object.keys(data.commandResults[entityType.toLowerCase()]).length :
            0

        if (data.commandResults[entityType.toLowerCase()] === undefined) {
            data.commandResults[entityType.toLowerCase()] = {}
        }
        data.commandResults[entityType.toLowerCase()][commandId] = resultData

        ctx.status = 200
        ctx.set('Location', `command/${entityType.toLowerCase()}/${commandId}`)
        ctx.body = {
            entityType: entityType,
            data: resultData,
            logs: [], // TODO add logs here
        }
        console.log('dataObject: ', data)
        console.log('logger: ', entity.logger.info)

    } catch (error) {
        console.error(error)
        if (body.isAsync) {
            ctx.status = 200
            ctx.body = {
                asyncError: error.message,
                errorCode: error.code,
            }
        } else {
            ctx.status = 200
            ctx.body = {
                errorCode: error.code,
                exception: error.message,
            }

        }
    }
}

const getEntityFromLocation = (location: string, data: Data) => {
    const urlParts = location.split('/')

    /**
     * location string is in the form of:
     *  - URL = /entitiyType/id
     *  - body params = entityType/id
     * and therefore split on `/` will return an array of length 3 for URL and 2 for body params
     */
    if (urlParts.length === 3 || urlParts.length === 2) {
        const entityType = urlParts[urlParts.length - 2]
        const id = urlParts[urlParts.length - 1]
        let entity
        if (entityType === 'user') {
            entity = data.users[id]
        }
        if (entityType === 'client') {
            entity = data.clients[id]
        }
        return entity
    } else if (urlParts.length === 4) {
        const command = urlParts[urlParts.length - 3]
        const entityType = urlParts[urlParts.length - 2]
        const id = urlParts[urlParts.length - 1]
        console.log('command: ', command)
        if (command === 'command') {
            console.log('data: ', data)
            console.log('commandResults: ', data.commandResults)
            console.log('entityType: ', data.commandResults[entityType])
            console.log('id: ', data.commandResults[entityType][id])
            return data.commandResults[entityType][id]
        }
    }
    return undefined
}

const parseParams = (params: object | any, data: Data): parsedParams => {
    const parsedParams: parsedParams = []
    params.forEach((element) => {
        if (element.value !== undefined) {
            parsedParams.push(element.value)
        } else if (element.location !== undefined) {
            parsedParams.push(getEntityFromLocation(element.location, data))
        }
    })
    return parsedParams
}

const invokeCommand = async (
    entity: DVCClient | DVCUser | DVCVariable | any,
    command: string,
    params: parsedParams,
    isAsync: boolean) => {
    if (isAsync) {
        const result = await entity[command](...params)
        return result
    }
    console.log('entity: ', entity)
    console.log('command: ', command)
    console.log('fn: ', entity[command])
    return entity[command](...params)

}

export const validateLocationRequest =
    (ctx: Koa.ParameterizedContext, data: Data) => {
        const entity = getEntityFromLocation(ctx.request.url, data)
        const body = ctx.request.body as LocationRequestBody

        if (entity === undefined) {
            ctx.status = 400
            ctx.body = {
                errorCode: 400,
                errorMessage: 'Invalid request: missing entity',
            }
            return ctx
        }
        if (body.command === undefined) {
            ctx.status = 400
            ctx.body = {
                errorCode: 400,
                errorMessage: 'Invalid request: missing command',
            }
            return ctx
        }
        handleLocation(ctx, data, body, entity)
    }
