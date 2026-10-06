import { LocalTestClient, getSDKScope, hasCapability } from '../helpers'
import { Capabilities } from '../types'
import {
    AudienceOperator,
    ConfigBody,
    FeatureType,
    FilterType,
    PublicRollout,
    VariableType,
} from '@devcycle/types'

const DAY_MS = 24 * 60 * 60 * 1000

const targetId = '6a1f0c3e9b2d4e5f6a7b8c9d'
const variableKey = 'rollout-var'

// Rollout hashes are deterministic per (user_id, target _id). These values were
// computed with murmurhash v3 the same way the bucketing libraries do:
// rolloutHash = murmurhash(`${user_id}_rollout`, murmurhash(targetId, 1)) / MAX_UINT32
const users = {
    // rolloutHash ~= 0.0248
    lowHash: 'rollout-user-9',
    // rolloutHash ~= 0.2392
    midHash: 'rollout-user-14',
    // rolloutHash ~= 0.3938
    upperMidHash: 'rollout-user-2',
    // rolloutHash ~= 0.9115
    highHash: 'rollout-user-4',
}

const rolloutConfig = (
    baseConfig: ConfigBody,
    rollout: PublicRollout,
): ConfigBody => ({
    ...baseConfig,
    features: [
        {
            _id: '6a1f0c3e9b2d4e5f6a7b8c90',
            key: 'rollout-feature',
            type: FeatureType.release,
            variations: [
                {
                    _id: '6a1f0c3e9b2d4e5f6a7b8c91',
                    key: 'variation-on',
                    name: 'Variation On',
                    variables: [
                        { _var: '6a1f0c3e9b2d4e5f6a7b8c92', value: true },
                    ],
                },
            ],
            configuration: {
                _id: '6a1f0c3e9b2d4e5f6a7b8c93',
                targets: [
                    {
                        _id: targetId,
                        _audience: {
                            _id: '6a1f0c3e9b2d4e5f6a7b8c94',
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
                        rollout,
                        distribution: [
                            {
                                _variation: '6a1f0c3e9b2d4e5f6a7b8c91',
                                percentage: 1,
                            },
                        ],
                    },
                ],
                forcedUsers: {},
            },
        },
    ],
    variables: [
        {
            _id: '6a1f0c3e9b2d4e5f6a7b8c92',
            key: variableKey,
            type: VariableType.boolean,
        },
    ],
})

describe('Rollout Tests - Local', () => {
    const { sdkName, scope } = getSDKScope()

    const isUserInRollout = async (
        testClient: LocalTestClient,
        userId: string,
    ) => {
        const response = await testClient.callAllVariables({
            user_id: userId,
        })
        const { data: variablesMap } = await response.json()
        return variablesMap[variableKey]?.value === true
    }

    const createClientWithRollout = async (rollout: PublicRollout) => {
        const testClient = new LocalTestClient(sdkName)
        scope
            .get(testClient.getValidConfigPath())
            .reply(200, rolloutConfig(testClient.getValidConfig(), rollout))

        if (hasCapability(sdkName, Capabilities.sdkConfigEvent)) {
            scope
                .post(`/client/${testClient.clientId}/v1/events/batch`)
                .reply(201, { message: 'Successfully received events.' })
        }

        await testClient.createClient(true, {
            configPollingIntervalMS: 60000,
            eventFlushIntervalMS: 500,
        })
        return testClient
    }

    describe('gradual rollout with a non-zero start percentage', () => {
        // 50% -> 100% over 100 days, 10 days in (t = 0.1).
        // Expected rollout percentage: 0.5 + (1 - 0.5) * 0.1 = 0.55
        let testClient: LocalTestClient

        beforeEach(async () => {
            const now = Date.now()
            testClient = await createClientWithRollout({
                type: 'gradual',
                startPercentage: 0.5,
                startDate: new Date(now - 10 * DAY_MS),
                stages: [
                    {
                        type: 'linear',
                        date: new Date(now + 90 * DAY_MS),
                        percentage: 1,
                    },
                ],
            })
        })

        it('should include users below the start percentage', async () => {
            expect(await isUserInRollout(testClient, users.lowHash)).toBe(true)
            expect(await isUserInRollout(testClient, users.midHash)).toBe(true)
            expect(await isUserInRollout(testClient, users.upperMidHash)).toBe(
                true,
            )
        })

        it('should exclude users above the interpolated percentage', async () => {
            expect(await isUserInRollout(testClient, users.highHash)).toBe(
                false,
            )
        })
    })

    describe('gradual rollback from 100% to 0%', () => {
        // 100% -> 0% over 100 days, 10 days in (t = 0.1).
        // Expected rollout percentage: 1 + (0 - 1) * 0.1 = 0.9
        let testClient: LocalTestClient

        beforeEach(async () => {
            const now = Date.now()
            testClient = await createClientWithRollout({
                type: 'gradual',
                startPercentage: 1,
                startDate: new Date(now - 10 * DAY_MS),
                stages: [
                    {
                        type: 'linear',
                        date: new Date(now + 90 * DAY_MS),
                        percentage: 0,
                    },
                ],
            })
        })

        it('should ramp down gradually instead of dropping to 0%', async () => {
            expect(await isUserInRollout(testClient, users.lowHash)).toBe(true)
            expect(await isUserInRollout(testClient, users.upperMidHash)).toBe(
                true,
            )
        })

        it('should exclude users above the interpolated percentage', async () => {
            expect(await isUserInRollout(testClient, users.highHash)).toBe(
                false,
            )
        })
    })
})
