import { optionalEventFields, optionalUserEventFields } from '../mockData/events'
import { getPlatformBySdkName, getSDKName, hasCapability } from './helpers'
import { Capabilities } from '../types'

export const expectAggregateEvaluationEvent = ({
    body,
    variableKey,
    variationId,
    featureId,
    value,
    etag
}: {
   body: Record<string, unknown>,
   variableKey: string,
   featureId: string,
   variationId: string,
   etag: string,
   value?: number
}) => {
    const sdkName = getSDKName()
    const expectedPlatform = getPlatformBySdkName(sdkName)
    const metadata: Record<string, unknown> = {_feature: featureId, _variation: variationId}
    if (hasCapability(sdkName, Capabilities.etagReporting)) {
        metadata.configEtag = etag
        metadata.clientUUID = expect.any(String)
    }
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
                    target: variableKey,
                    metaData: metadata,
                    // featureVars is always empty for aggregated evaluation events
                    featureVars: {},
                    value: value !== undefined ? value : 1,
                    customType: expect.toBeNil()
                }
            ]
        }]
    })
}

export const expectAggregateDefaultEvent = ({body, variableKey, defaultReason, value, etag}: {
    body: Record<string, unknown>,
    variableKey: string,
    defaultReason: string,
    etag: string | null,
    value?: number,
}) => {
    const sdkName = getSDKName()
    const expectedPlatform = getPlatformBySdkName(sdkName)
    const metadata: Record<string, unknown> = hasCapability(sdkName, Capabilities.defaultReason) ? { defaultReason } : {}
    if (hasCapability(sdkName, Capabilities.etagReporting)) {
        if (etag) {
            metadata.configEtag = etag
        }
        metadata.clientUUID = expect.any(String)
    }

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
                    target: variableKey,
                    metaData: Object.keys(metadata).length ? metadata : expect.toBeNil(),
                    // featureVars is always empty for aggregated evaluation events
                    featureVars: {},
                    value: value !== undefined ? value : 1,
                    customType: expect.toBeNil()
                }
            ]
        }]
    })
}
