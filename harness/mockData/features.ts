import { BucketedUserConfig, FeatureType } from '@devcycle/types'

export const features: BucketedUserConfig['features'] = {
    'test-harness': {
        _id: '638680d6fcb67b96878d90e6',
        key: 'test-harness',
        type: FeatureType.release,
        _variation: '638680d6fcb67b96878d90ec',
        variationName: 'Variation On',
        variationKey: 'variation-on',
    },
    'schedule-feature': {
        _id: '6386813a59f1b81cc9e6c68d',
        key: 'schedule-feature',
        type: FeatureType.release,
        _variation: '6386813a59f1b81cc9e6c693',
        variationName: 'Variation On',
        variationKey: 'variation-on',
    },
}
