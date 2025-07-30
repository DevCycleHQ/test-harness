import { Capabilities } from '../types'
import { hasCapability } from './helpers'

export type CommandBody = {
    command: string
    isAsync?: boolean
    params: ({ value: unknown } | { type: 'user' | 'event' })[]
    user?: Record<string, unknown>
    event?: Record<string, unknown>
}
export const sendCommand = async (url: string, body: CommandBody) => {
    return await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            command: body.command,
            isAsync: body.isAsync,
            params: body.params,
            user: body.user,
            event: body.event,
        }),
    })
}
export const callVariableValue = async (
    url: string,
    user: Record<string, unknown>,
    sdkName: string,
    isAsync: boolean,
    key?: string,
    variableType?: string,
    defaultValue?: any,
) => {
    return await performCallVariable(
        url,
        user,
        sdkName,
        isAsync,
        key,
        variableType,
        defaultValue,
        'variableValue',
    )
}
export const callVariable = async (
    url: string,
    user: Record<string, unknown>,
    sdkName: string,
    isAsync: boolean,
    key?: string,
    variableType?: string,
    defaultValue?: any,
) => {
    return await performCallVariable(
        url,
        user,
        sdkName,
        isAsync,
        key,
        variableType,
        defaultValue,
        'variable',
    )
}
export const performCallVariable = async (
    url: string,
    user: Record<string, unknown>,
    sdkName: string,
    isAsync: boolean,
    key?: string,
    variableType?: string,
    defaultValue?: any,
    command = 'variable',
) => {
    const params: CommandBody['params'] = [
        { type: 'user' },
        { value: key },
        { value: defaultValue },
    ]
    // Need to pass in the variable type into the OpenFeature provider as it doesn't have a generic variable interface
    if (hasCapability(sdkName, Capabilities.openFeature)) {
        params.push({ value: variableType })
    }
    return await sendCommand(url, {
        command,
        user,
        params,
        isAsync,
    })
}
export const callAllVariables = async (
    url: string,
    user: Record<string, unknown>,
    isAsync: boolean,
) => {
    return await sendCommand(url, {
        command: 'allVariables',
        user,
        params: [{ type: 'user' }],
        isAsync,
    })
}
export const callTrack = async (
    url: string,
    user: Record<string, unknown>,
    event: Record<string, unknown>,
    isAsync: boolean,
) => {
    return await sendCommand(url, {
        command: 'track',
        user,
        event,
        params: [{ type: 'user' }, { type: 'event' }],
        isAsync,
    })
}
export const callAllFeatures = async (
    url: string,
    user: Record<string, unknown>,
    isAsync: boolean,
) => {
    return await sendCommand(url, {
        command: 'allFeatures',
        user,
        params: [{ type: 'user' }],
        isAsync,
    })
}

export const callGetClientBootstrapConfig = async (
    url: string,
    user: Record<string, unknown>,
    userAgent: string,
) => {
    return await sendCommand(url, {
        command: 'getClientBootstrapConfig',
        user,
        params: [{ type: 'user' }, { value: userAgent }],
        isAsync: true,
    })
}
