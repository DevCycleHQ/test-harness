import {
    AudienceOperator,
    ConfigBody,
    DataKeyType,
    FeatureType,
    FilterComparator,
    FilterType,
    UserSubType,
    VariableType,
} from '@devcycle/types'

export const config: ConfigBody = {
    project: {
        _id: '638680c459f1b81cc9e6c557',
        key: 'test-harness-data',
        a0_organization: 'org_fakeorg',
        settings: {
            edgeDB: {
                enabled: false,
            },
            optIn: {
                enabled: false,
                colors: {
                    primary: '#000000',
                    secondary: '#000000',
                },
            },
        },
    },
    environment: {
        _id: '638680c459f1b81cc9e6c559',
        key: 'development',
    },
    features: [
        {
            _id: '638680d6fcb67b96878d90e6',
            key: 'test-harness',
            type: FeatureType.release,
            variations: [
                {
                    key: 'variation-on',
                    name: 'Variation On',
                    variables: [
                        {
                            _var: '638681f059f1b81cc9e6c7fa',
                            value: true,
                        },
                        {
                            _var: '638681f059f1b81cc9e6c7fb',
                            value: 'string',
                        },
                        {
                            _var: '638681f059f1b81cc9e6c7fc',
                            value: 1,
                        },
                        {
                            _var: '638681f059f1b81cc9e6c7fd',
                            value: {
                                facts: true,
                            },
                        },
                        {
                            _var: '638681f059f1b81cc9e6c7fe',
                            value: '↑↑↓↓←→←→BA 🤖',
                        },
                    ],
                    _id: '638680d6fcb67b96878d90ec',
                },
                {
                    key: 'variation-off',
                    name: 'Variation Off',
                    variables: [
                        {
                            _var: '638681f059f1b81cc9e6c7fa',
                            value: false,
                        },
                        {
                            _var: '638681f059f1b81cc9e6c7fb',
                            value: 'string-off',
                        },
                        {
                            _var: '638681f059f1b81cc9e6c7fc',
                            value: 2,
                        },
                        {
                            _var: '638681f059f1b81cc9e6c7fd',
                            value: {
                                facts: false,
                            },
                        },
                        {
                            _var: '638681f059f1b81cc9e6c7fe',
                            value: '🙃',
                        },
                    ],
                    _id: '638680d6fcb67b96878d90ed',
                },
            ],
            configuration: {
                _id: '638680d659f1b81cc9e6c5a8',
                targets: [
                    {
                        _audience: {
                            _id: '638680d659f1b81cc9e6c5a9',
                            filters: {
                                filters: [
                                    {
                                        type: FilterType.user,
                                        subType: UserSubType.customData,
                                        comparator: FilterComparator['='],
                                        dataKey: 'should-bucket',
                                        dataKeyType: DataKeyType.boolean,
                                        values: [true],
                                        filters: [],
                                    },
                                ],
                                operator: AudienceOperator.or,
                            },
                        },
                        distribution: [
                            {
                                _variation: '638680d6fcb67b96878d90ec',
                                percentage: 1,
                            },
                        ],
                        _id: '638680d659f1b81cc9e6c5ab',
                    },
                ],
                forcedUsers: {},
            },
        },
        {
            _id: '6386813a59f1b81cc9e6c68d',
            key: 'schedule-feature',
            type: FeatureType.release,
            variations: [
                {
                    key: 'variation-on',
                    name: 'Variation On',
                    variables: [
                        {
                            _var: '6386813a59f1b81cc9e6c68f',
                            value: true,
                        },
                    ],
                    _id: '6386813a59f1b81cc9e6c693',
                },
                {
                    key: 'variation-off',
                    name: 'Variation Off',
                    variables: [
                        {
                            _var: '6386813a59f1b81cc9e6c68f',
                            value: false,
                        },
                    ],
                    _id: '6386813a59f1b81cc9e6c694',
                },
            ],
            configuration: {
                _id: '6386813a59f1b81cc9e6c6b0',
                targets: [
                    {
                        _audience: {
                            _id: '6386813a59f1b81cc9e6c6b1',
                            filters: {
                                filters: [
                                    {
                                        type: FilterType.all,
                                        values: [],
                                        filters: [],
                                    },
                                ],
                                operator: AudienceOperator.and,
                            },
                        },
                        distribution: [
                            {
                                _variation: '6386813a59f1b81cc9e6c693',
                                percentage: 1,
                            },
                        ],
                        _id: '6386813a59f1b81cc9e6c6b6',
                    },
                ],
                forcedUsers: {},
            },
        },
    ],
    variables: [
        {
            _id: '638681f059f1b81cc9e6c7fa',
            key: 'bool-var',
            type: VariableType.boolean,
        },
        {
            _id: '638681f059f1b81cc9e6c7fd',
            key: 'json-var',
            type: VariableType.json,
        },
        {
            _id: '638681f059f1b81cc9e6c7fc',
            key: 'number-var',
            type: VariableType.number,
        },
        {
            _id: '6386813a59f1b81cc9e6c68f',
            key: 'schedule-feature',
            type: VariableType.boolean,
        },
        {
            _id: '638681f059f1b81cc9e6c7fb',
            key: 'string-var',
            type: VariableType.string,
        },
        {
            _id: '638680d6fcb67b96878d90e8',
            key: 'test-harness',
            type: VariableType.boolean,
        },
        {
            _id: '638681f059f1b81cc9e6c7fe',
            key: 'unicode-var',
            type: VariableType.string,
        },
    ],
    variableHashes: {
        'bool-var': 4169114058,
        'json-var': 911896931,
        'number-var': 2467683513,
        'schedule-feature': 66456795,
        'string-var': 2413071944,
        'test-harness': 1034405338,
        'unicode-var': 2917818241,
    },
    ably: {
        apiKey: 'fakekey',
    },
}

export const expectedFeaturesVariationOn = {
    'test-harness': {
        _id: '638680d6fcb67b96878d90e6',
        type: 'release',
        key: 'test-harness',
        _variation: '638680d6fcb67b96878d90ec',
        variationName: 'Variation On',
        variationKey: 'variation-on',
    },
    'schedule-feature': {
        _id: '6386813a59f1b81cc9e6c68d',
        type: 'release',
        key: 'schedule-feature',
        _variation: '6386813a59f1b81cc9e6c693',
        variationName: 'Variation On',
        variationKey: 'variation-on',
    },
}
