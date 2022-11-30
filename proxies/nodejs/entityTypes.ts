import { DVCClient, DVCUser } from '@devcycle/nodejs-server-sdk'

export enum EntityTypes {
    user = 'User',
    variable = 'Variable',
    feature = 'Feature',
    object = 'Object',
}

export type DataStore = {
    clients: { [key: string]: DVCClient }
    users: { [key: string]: DVCUser }
    commandResults: { [key: string]: any }
}

export const getEntityFromType = (value: string): string => {
    switch (value) {
        case 'DVCUser':
            return EntityTypes.user
        case 'DVCVariable':
            return EntityTypes.variable
        case 'DVCFeature':
            return EntityTypes.feature
        default:
            return EntityTypes.object
    }
}
