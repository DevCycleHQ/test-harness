export enum EntityTypes {
  user = 'User',
  variable = 'Variable',
  feature = 'Feature',
  object = 'Object',
}

export const convertEntityTypes = (value: string): EntityTypes => {
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
