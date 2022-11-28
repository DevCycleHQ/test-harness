import { DVCClient, DVCUser, DVCVariable } from '@devcycle/nodejs-server-sdk'
import Koa from 'koa'
import { getEntityFromType, Data } from '../entityTypes'
import axios from 'axios'

//HTTP request comes in as string
type LocationRequestBody = {
    command: string
    params: string //[{value: string | number | boolean} | {location: string} | {callbackUrl: string}] 
    isAsync: boolean
}

type parsedParams = (string | boolean | number | object | URL)[];

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
        const lastParam = params[params.length - 1]

        if (lastParam instanceof URL) {
            const callbackURL: URL = lastParam
            const onUpdateCallback = (command, responseData) => {

                axios
                    .post(callbackURL.href, {
                        entityType: getEntityFromType(responseData.constructor.name),
                        message: `${command} was invoked on ${ctx.request.url}`,
                    })
                    .then((resp: any) => console.log('onUpdatecallback data ', resp.data))
                    .catch((e) => console.error(e))
            }
            invokeCommand(entity, command, params, body.isAsync).then((responseData) => {
                onUpdateCallback(command, responseData)
            }).catch((e) => console.error(e))
            ctx.status = 200
            ctx.body = {
                entityType: 'pending', // TODO: add pending entity type
                data: 'pending',
                logs: [], // TODO add logs here
            }
        } else {
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
        }
        console.log('dataObject: ', data)
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
        } else if (element.callbackURL !== undefined) {
            parsedParams.push(new URL(element.callbackURL))
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
