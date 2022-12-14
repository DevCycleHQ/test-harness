import { DVCClient, DVCUser, DVCVariable } from '@devcycle/nodejs-server-sdk'
import Koa from 'koa'
import { getEntityFromType, DataStore, EntityTypes } from '../entityTypes'
import { dataStore } from '../app'

//HTTP request comes in as string
type LocationRequestBody = {
    command: string
    params: string //[{value: string | number | boolean} | {location: string} | {callbackUrl: string}]
    entity: DVCClient | DVCUser | DVCVariable
    isAsync: boolean
}

type ParsedParams = (string | boolean | number | object | URL)[]

export const handleLocation = async (
    ctx: Koa.ParameterizedContext
) => {
    const { entity, command, params, isAsync } = ctx.request.body as LocationRequestBody
    try {
        const parsedParams: ParsedParams = parseParams(
            params,
            dataStore
        )

        let result
        if (isAsync) {
            result = await invokeCommand(
                entity,
                command,
                parsedParams
            )
        } else {
            result = invokeCommand(
                entity,
                command,
                parsedParams
            )
        }

        const entityType = result ? getEntityFromType(result.constructor.name) : EntityTypes.void

        const commandId = dataStore.commandResults[command] !== undefined ?
            Object.keys(dataStore.commandResults[command]).length :
            0

        if (dataStore.commandResults[command] === undefined) {
            dataStore.commandResults[command] = {}
        }
        dataStore.commandResults[command][commandId] = result

        ctx.status = 201
        ctx.set('Location', `command/${command}/${commandId}`)
        ctx.body = {
            entityType: entityType,
            data: entityType === EntityTypes.client ? {} : result,
            logs: [], // TODO add logs
        }

    } catch (error) {
        console.error(error)
        if (isAsync) {
            ctx.status = 200
            ctx.body = {
                asyncError: error.message,
                stack: error.stack
            }
        } else {
            ctx.status = 200
            ctx.body = {
                exception: error.message,
                stack: error.stack
            }
        }
    }
}

const getEntityFromLocation = (location: string, data: DataStore) => {
    const urlParts = location.replace(/^\//, '').split('/')
    const [locationType, ...locationPath] = urlParts

    if (locationType === 'command') {
        const [entityType, commandId] = locationPath
        return data.commandResults[entityType][commandId]
    } else if (locationType === 'client') {
        const [clientId] = locationPath
        return data.clients[clientId]
    } else if (locationType === 'user') {
        const [userId] = locationPath
        return data.users[userId]
    }

    return undefined
}

const parseParams = (params: object | any, data: DataStore): ParsedParams => {
    const parsedParams: ParsedParams = []
    params.forEach((element) => {
        if (element.location) {
            parsedParams.push(getEntityFromLocation(element.location, data))
        } else if (element.callbackURL) {
            parsedParams.push(new URL(element.callbackURL))
        } else {
            parsedParams.push(element.value)
        }
    })
    return parsedParams
}

const invokeCommand = (
    entity: DVCClient | DVCUser | DVCVariable | any,
    command: string,
    params: ParsedParams,
) => {
    return entity[command](...params)
}

export const validateLocationReqMiddleware = async (ctx: Koa.ParameterizedContext, next) => {
    const entity = getEntityFromLocation(ctx.request.url, dataStore)
    const body = ctx.request.body as LocationRequestBody

    if (entity === undefined) {
        ctx.status = 404
        ctx.body = {
            message: 'Invalid request: missing entity',
        }
        return ctx
    }
    if (body.command === undefined) {
        ctx.status = 404
        ctx.body = {
            message: 'Invalid request: missing command',
        }
        return ctx
    }
    body.entity = entity
    await next()
}
