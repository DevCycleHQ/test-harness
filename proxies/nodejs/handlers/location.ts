import { DVCClient, DVCUser, DVCVariable } from '@devcycle/nodejs-server-sdk'
import Koa from 'koa'
import { getEntityFromType, DataStore } from '../entityTypes'
import axios from 'axios'
import { dataStore } from '../app'

//HTTP request comes in as string
type LocationRequestBody = {
    command: string
    params: string //[{value: string | number | boolean} | {location: string} | {callbackUrl: string}]
    entity: DVCClient | DVCUser | DVCVariable
    isAsync: boolean
}

type ParsedParams = (string | boolean | number | object | URL)[]

const CALLBACK_COMMANDS = ['onClientInitialized']

export const handleLocation = async (
    ctx: Koa.ParameterizedContext
) => {
    const { entity, command, params, isAsync } = ctx.request.body as LocationRequestBody
    try {
        const parsedParams: ParsedParams = parseParams(
            params,
            dataStore
        )
        const lastParam = parsedParams[parsedParams.length - 1]

        if (lastParam instanceof URL) {
            const callbackURL: URL = lastParam
            if (!CALLBACK_COMMANDS.includes(command)) {
                ctx.status = 404
                ctx.body = {
                    errorCode: 404,
                    exception: 'Invalid request: unsupported command',
                }
                return ctx
            }
            const onCallback = (command) => {
                fetch(callbackURL.href, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: `${command} was invoked on ${ctx.request.url}`
                    })
                }).catch((e) => console.error(e))
            }
            entity[command](() => onCallback(command)).catch((e) => console.error(e))
            ctx.status = 200
            ctx.body = {
                message: `${command} attached to ${ctx.request.url} with url ${callbackURL.href}`,
            }
        } else {
            const resultData = await invokeCommand(
                entity,
                command,
                parsedParams,
                isAsync
            )

            const entityType = getEntityFromType(resultData.constructor.name)

            const commandId = dataStore.commandResults[command] !== undefined ?
                Object.keys(dataStore.commandResults[command]).length :
                0

            if (dataStore.commandResults[command] === undefined) {
                dataStore.commandResults[command] = {}
            }
            dataStore.commandResults[command][commandId] = resultData

            ctx.status = 200
            ctx.set('Location', `command/${command}/${commandId}`)
            ctx.body = {
                entityType: entityType,
                data: resultData,
                logs: [], // TODO add logs here
            }
        }
    } catch (error) {
        console.error(error)
        if (isAsync) {
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
                stack: error.stack
            }
        }
    }
}

const getEntityFromLocation = (location: string, data: DataStore) => {
    const urlParts = location.replace(/^\//, '').split('/')
    const [locationType, ...locationPath] = urlParts

    console.log('command: ', locationType)

    if (locationType === 'command') {
        const [entityType, commandId] = locationPath
        // debug logs
        console.log('data: ', data)
        console.log('commandResults: ', data.commandResults)
        console.log('entityType: ', data.commandResults[entityType])
        console.log('id: ', data.commandResults[entityType][commandId])

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

const invokeCommand = async (
    entity: DVCClient | DVCUser | DVCVariable | any,
    command: string,
    params: ParsedParams,
    isAsync: boolean) => {
    if (isAsync) {
        return await entity[command](...params)
    }
    return entity[command](...params)
}

export const validateLocationReqMiddleware = async (ctx: Koa.ParameterizedContext, next) => {
    const entity = getEntityFromLocation(ctx.request.url, dataStore)
    const body = ctx.request.body as LocationRequestBody

    if (entity === undefined) {
        ctx.status = 404
        ctx.body = {
            errorCode: 404,
            errorMessage: 'Invalid request: missing entity',
        }
        return ctx
    }
    if (body.command === undefined) {
        ctx.status = 404
        ctx.body = {
            errorCode: 404,
            errorMessage: 'Invalid request: missing command',
        }
        return ctx
    }
    body.entity = entity
    await next()
}
