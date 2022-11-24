export enum EntityTypes {
  user = 'User',
  variable = 'Variable',
  feature = 'Feature',
  object = 'Object',
}

export const getEntityModelFromType = (value: string): EntityTypes => {
    switch (value) {
        case 'DVCUser':
            return EntityTypes.user
        case 'DVCVariable':
            return EntityTypes.variable
        case 'DVCFeature':
            return EntityTypes.feature
        case 'DVCObject':
            return EntityTypes.object
        default:
            return EntityTypes.object
    }
}

export const getEntityNameFromType = (value: string): string => {
    switch (value) {
        case 'DVCUser':
            return 'user'
        case 'DVCVariable':
            return 'variable'
        case 'DVCFeature':
            return 'feature'
        case 'DVCObject':
            return 'object'
        default:
            return 'object'
    }
}
