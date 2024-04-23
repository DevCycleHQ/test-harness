import { optionalEventFields, optionalUserEventFields } from '../mockData/events'
import { getPlatformBySdkName, getSDKName, hasCapability, waitForRequest } from './helpers'
import { Capabilities } from '../types'
import { Scope } from 'nock'

export const expectAggregateEvaluationEvent = ({
    body,
    variableKey,
    variationId,
    featureId,
    value,
    etag,
    rayId
}: {
   body: Record<string, unknown>,
   variableKey: string,
   featureId: string,
   variationId: string,
   etag: string,
    rayId: string,
   value?: number
}) => {
    const sdkName = getSDKName()
    const expectedPlatform = getPlatformBySdkName(sdkName)
    const metadata: Record<string, unknown> = {_feature: featureId, _variation: variationId}
    if (hasCapability(sdkName, Capabilities.etagReporting)) {
        metadata.configEtag = etag
        metadata.configRayId = rayId
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

export const expectAggregateDefaultEvent = ({body, variableKey, defaultReason, value, etag, rayId}: {
    body: Record<string, unknown>,
    variableKey: string,
    defaultReason: string,
    etag: string | null,
    rayId: string,
    value?: number,
}) => {
    const sdkName = getSDKName()
    const expectedPlatform = getPlatformBySdkName(sdkName)
    const metadata: Record<string, unknown> = hasCapability(sdkName, Capabilities.defaultReason) ? { defaultReason } : {}
    if (hasCapability(sdkName, Capabilities.etagReporting)) {
        if (etag != null) {
            metadata.configEtag = etag
        }
        if (rayId != null) {
            metadata.configRayId = rayId
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

export const interceptEvents = (scope: Scope, sdkName: string, eventsUrl: string) => {
    if (!hasCapability(sdkName, Capabilities.events)) {
        return
    }
    // The interceptor instance is used to wait on events that are triggered when calling
    // methods so that we can verify events being sent out and mock out responses from the
    // event server
    const interceptor = scope.post(eventsUrl)

    const eventResult = {
        body: {},
        wait: () => waitForRequest(scope, interceptor, 600, 'Event callback timed out')
    }

    interceptor.reply((uri, body) => {
        eventResult.body = body
        return [201, { message:'Successfully received events.' }]
    })
    return eventResult
}
