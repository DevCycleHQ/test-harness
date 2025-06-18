import { BucketedUserConfig, VariableType } from '@devcycle/types'

export function getMockedVariables(
    hasVariablesFeatureId: boolean,
    hasEvalReason: boolean,
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
            ...(hasEvalReason
                ? {
                      eval: {
                          details: 'Custom Data -> should-bucket',
                          reason: 'TARGETING_MATCH',
                          targetId: '638680d659f1b81cc9e6c5ab',
                      },
                  }
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
            ...(hasEvalReason
                ? {
                      eval: {
                          details: 'Custom Data -> should-bucket',
                          reason: 'TARGETING_MATCH',
                          targetId: '638680d659f1b81cc9e6c5ab',
                      },
                  }
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
            ...(hasEvalReason
                ? {
                      eval: {
                          details: 'Custom Data -> should-bucket',
                          reason: 'TARGETING_MATCH',
                          targetId: '638680d659f1b81cc9e6c5ab',
                      },
                  }
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
            ...(hasEvalReason
                ? {
                      eval: {
                          details: 'Custom Data -> should-bucket',
                          reason: 'TARGETING_MATCH',
                          targetId: '638680d659f1b81cc9e6c5ab',
                      },
                  }
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
            ...(hasEvalReason
                ? {
                      eval: {
                          details: 'All Users',
                          reason: 'TARGETING_MATCH',
                          targetId: '6386813a59f1b81cc9e6c6b6',
                      },
                  }
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
            ...(hasEvalReason
                ? {
                      eval: {
                          details: 'Custom Data -> should-bucket',
                          reason: 'TARGETING_MATCH',
                          targetId: '638680d659f1b81cc9e6c5ab',
                      },
                  }
                : {}),
        },
    }
}
