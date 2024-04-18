import { optionalEventFields, optionalUserEventFields } from '../mockData/events'
import { getPlatformBySdkName, getSDKScope, hasCapability } from './helpers'
import { Capabilities } from '../types'

export const expectAggregateEvaluationEvent = (
    body: Record<string, unknown>,
    variableId: string,
    featureId: string,
    variationId: string,
    value?: number
) => {
    const { sdkName,  } = getSDKScope()
    const expectedPlatform = getPlatformBySdkName(sdkName)

    expect(body).toEqual({
        batch: [{
            user: {
                ...optionalUserEventFields,
                user_id: expect.any(String),
                platform: expectedPlatform,
                sdkType: 'server'
            },
            events: [
                {
                    ...optionalEventFields,
                    user_id: expect.any(String),
                    type: 'aggVariableEvaluated',
                    target: variableId,
                    metaData: {
                        _feature: featureId,
                        _variation: variationId
                    },
                    // featureVars is always empty for aggregated evaluation events
                    featureVars: {},
                    value: value !== undefined ? value : 1,
                    customType: expect.toBeNil()
                }
            ]
        }]
    })
}

export const expectAggregateDefaultEvent = (
    body: Record<string, unknown>,
    variableId: string,
    defaultReason: string,
value?: number,
) => {
    const { sdkName,  } = getSDKScope()
    const expectedPlatform = getPlatformBySdkName(sdkName)

    expect(body).toEqual({
        batch: [{
            user: {
                ...optionalUserEventFields,
                user_id: expect.any(String),
                platform: expectedPlatform,
                sdkType: 'server'
            },
            events: [
                {
                    ...optionalEventFields,
                    user_id: expect.any(String),
                    type: 'aggVariableDefaulted',
                    target: variableId,
                    metaData: hasCapability(sdkName, Capabilities.defaultReason) ? { defaultReason } : expect.toBeNil(),
                    // featureVars is always empty for aggregated evaluation events
                    featureVars: {},
                    value: value !== undefined ? value : 1,
                    customType: expect.toBeNil()
                }
            ]
        }]
    })
}
