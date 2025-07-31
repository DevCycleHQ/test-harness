import { BucketedUserConfig, EVAL_REASONS, VariableType } from '@devcycle/types'

export function getMockedVariables(
    hasVariablesFeatureId: boolean,
    hasEvalReason: boolean,
    hasBaseEvalReason: boolean,
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
            ...getEvalReason(hasBaseEvalReason, hasEvalReason, EVAL_REASONS.TARGETING_MATCH, 'Custom Data -> should-bucket', '638680d659f1b81cc9e6c5ab'),
        },
        'string-var': {
            _id: '638681f059f1b81cc9e6c7fb',
            key: 'string-var',
            type: VariableType.string,
            value: 'string',
            ...(hasVariablesFeatureId
                ? { _feature: '638680d6fcb67b96878d90e6' }
                : {}),
            ...getEvalReason(hasBaseEvalReason, hasEvalReason, EVAL_REASONS.TARGETING_MATCH, 'Custom Data -> should-bucket', '638680d659f1b81cc9e6c5ab'),
        },
        'number-var': {
            _id: '638681f059f1b81cc9e6c7fc',
            key: 'number-var',
            type: VariableType.number,
            value: 1,
            ...(hasVariablesFeatureId
                ? { _feature: '638680d6fcb67b96878d90e6' }
                : {}),
            ...getEvalReason(hasBaseEvalReason, hasEvalReason, EVAL_REASONS.TARGETING_MATCH, 'Custom Data -> should-bucket', '638680d659f1b81cc9e6c5ab'),
            
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
            ...getEvalReason(hasBaseEvalReason, hasEvalReason, EVAL_REASONS.TARGETING_MATCH, 'Custom Data -> should-bucket', '638680d659f1b81cc9e6c5ab'),
        },
        'schedule-feature': {
            _id: '6386813a59f1b81cc9e6c68f',
            key: 'schedule-feature',
            type: VariableType.boolean,
            value: true,
            ...(hasVariablesFeatureId
                ? { _feature: '6386813a59f1b81cc9e6c68d' }
                : {}),
            ...getEvalReason(hasBaseEvalReason, hasEvalReason, EVAL_REASONS.TARGETING_MATCH, 'Custom Data -> should-bucket', '638680d659f1b81cc9e6c5ab'),
        },
        'unicode-var': {
            _id: '638681f059f1b81cc9e6c7fe',
            key: 'unicode-var',
            type: VariableType.string,
            value: '↑↑↓↓←→←→BA 🤖',
            ...(hasVariablesFeatureId
                ? { _feature: '638680d6fcb67b96878d90e6' }
                : {}),
            ...getEvalReason(hasBaseEvalReason, hasEvalReason, EVAL_REASONS.TARGETING_MATCH, 'Custom Data -> should-bucket', '638680d659f1b81cc9e6c5ab'),
        },
    }
}

function getEvalReason(hasBaseEvalReason: boolean, hasEvalReason: boolean, reason: EVAL_REASONS, details?: string, target_id?: string) {
    if (!hasEvalReason && !hasBaseEvalReason) {
        return {}
    }
    if (hasBaseEvalReason && hasEvalReason) {
        return { eval: { reason, details: "" } }
    }
    if (hasEvalReason){
        return { eval: { reason, details, target_id } }
    }
    return { eval: { reason, details: "" } }
}