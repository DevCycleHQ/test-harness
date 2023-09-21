import { DevCycleCloudClient } from '@devcycle/js-cloud-server-sdk'

export enum EntityTypes {
    user = 'User',
    variable = 'Variable',
    feature = 'Feature',
    object = 'Object',
    client = 'Client',
    void = 'Void'
}

export type DataStore = {
    clients: { [key: string]: DevCycleCloudClient }
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
        case 'DevCycleCloudClient':
            return EntityTypes.client
        default:
            return EntityTypes.object
    }
}
