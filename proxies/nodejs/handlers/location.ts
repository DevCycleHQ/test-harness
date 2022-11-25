import Koa from 'koa'
import { getEntityFromType, Data } from '../entityTypes'

//HTTP request comes in as string
type LocationRequestBody = {
    command: string
    params: string //[{value: string | number | boolean} | {location: string} | {callbackUrl: string}] 
    isAsync: boolean
}

export const handleLocation = async (
    ctx: Koa.ParameterizedContext,
    data: Data,
    body: LocationRequestBody,
    entity: any
) => {

    try {
        const command = body.command
        const params: string | boolean | number | object = parseParams(
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

        const commandId = data.commandResults[entityType.model] !== undefined ?
            Object.keys(data.commandResults[entityType.model]).length :
            0

        if (data.commandResults[entityType.model] === undefined) {
            data.commandResults[entityType.model] = {}
        }
        data.commandResults[entityType.model][commandId] = resultData

        ctx.status = 200
        ctx.set('Location', `command/${entityType.model}/${commandId}`)
        ctx.body = {
            entityType: entityType.type,
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

const getEntityFromLocation = (location, data) => {
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
        const command = urlParts[urlParts.length - 2]
        const entityType = urlParts[urlParts.length - 2]
        const id = urlParts[urlParts.length - 1]
        return data[command][entityType][id]
    }
    return undefined
}

const parseParams = (params, data): (string | boolean | number | any)[] => {
    const parsedParams: (string | boolean | number | object)[] = []
    params.forEach((element) => {
        if (element.value !== undefined) {
            parsedParams.push(element.value)
        } else if (element.location !== undefined) {
            parsedParams.push(getEntityFromLocation(element.location, data))
        }
    })
    return parsedParams
}

const invokeCommand = async (entity, command, params, isAsync) => {
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