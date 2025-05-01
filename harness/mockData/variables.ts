import { BucketedUserConfig, VariableType } from '@devcycle/types'

export function getMockedVariables(
    hasVariablesFeatureId: boolean,
): BucketedUserConfig['variables'] {
    return {
        'bool-var': {
            _id: '638681f059f1b81cc9e6c7fa',
            key: 'bool-var',
            type: VariableType.boolean,
            value: true,
            ...(hasVariablesFeatureId
                ? { _feature: '638680d6fcb67b96878d90e6' }
                : {}),
        },
        'string-var': {
            _id: '638681f059f1b81cc9e6c7fb',
            key: 'string-var',
            type: VariableType.string,
            value: 'string',
            ...(hasVariablesFeatureId
                ? { _feature: '638680d6fcb67b96878d90e6' }
                : {}),
        },
        'number-var': {
            _id: '638681f059f1b81cc9e6c7fc',
            key: 'number-var',
            type: VariableType.number,
            value: 1,
            ...(hasVariablesFeatureId
                ? { _feature: '638680d6fcb67b96878d90e6' }
                : {}),
        },
        'json-var': {
            _id: '638681f059f1b81cc9e6c7fd',
            key: 'json-var',
            type: VariableType.json,
            value: {
                facts: true,
            },
            ...(hasVariablesFeatureId
                ? { _feature: '638680d6fcb67b96878d90e6' }
                : {}),
        },
        'schedule-feature': {
            _id: '6386813a59f1b81cc9e6c68f',
            key: 'schedule-feature',
            type: VariableType.boolean,
            value: true,
            ...(hasVariablesFeatureId
                ? { _feature: '6386813a59f1b81cc9e6c68d' }
                : {}),
        },
        'unicode-var': {
            _id: '638681f059f1b81cc9e6c7fe',
            key: 'unicode-var',
            type: VariableType.string,
            value: '↑↑↓↓←→←→BA 🤖',
            ...(hasVariablesFeatureId
                ? { _feature: '638680d6fcb67b96878d90e6' }
                : {}),
        },
    }
}
