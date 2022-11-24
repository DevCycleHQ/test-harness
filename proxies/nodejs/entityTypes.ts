import { DVCClient, DVCUser } from '@devcycle/nodejs-server-sdk'

export enum EntityTypes {
    user = 'User',
    variable = 'Variable',
    feature = 'Feature',
    object = 'Object',
}

type Entity = {
    type: EntityTypes,
    model: string
}

export type Data = {
    clients: { [key: string]: DVCClient }
    users: { [key: string]: DVCUser }
    commandResults: { [key: string]: any }
}

export const getEntityFromType = (value: string): Entity => {
    switch (value) {
        case 'DVCUser':
            return { type: EntityTypes.user, model: 'user' }
        case 'DVCVariable':
            return { type: EntityTypes.variable, model: 'variable' }
        case 'DVCFeature':
            return { type: EntityTypes.feature, model: 'feature' }
        case 'DVCObject':
            return { type: EntityTypes.object, model: 'object' }
        default:
            return { type: EntityTypes.object, model: 'object' }
    }
}
