import {
    optionalEventFields,
    optionalUserEventFields,
} from '../mockData/events'
import {
    getPlatformBySdkName,
    getSDKName,
    hasCapability,
    waitForRequest,
} from './helpers'
import { Capabilities, SDKPlatformMap } from '../types'
import { Scope } from 'nock'

const addSDKConfigEventBatch = (
    sdkName: string,
    expectedPlatform: string,
    sdkPlatform: string,
) => {
    return hasCapability(sdkName, Capabilities.sdkConfigEvent)
        ? [
              {
                  user: {
                      ...optionalUserEventFields,
                      platform: expectedPlatform,
                      sdkType: 'server',
                      sdkPlatform: sdkPlatform,
                      user_id: expect.any(String),
                  },
                  events: [
                      {
                          ...optionalEventFields,
                          user_id: expect.any(String),
                          type: 'sdkConfig',
                          target: expect.any(String),
                          value: expect.any(Number),
                          featureVars: expect.toBeOneOf([
                              {
                                  '6386813a59f1b81cc9e6c68d':
                                      '6386813a59f1b81cc9e6c693',
                              },
                              {},
                          ]),
                          metaData: expect.objectContaining({
                              clientUUID: expect.any(String),
                              resStatus: 200,
                          }),
                      },
                  ],
              },
          ]
        : []
}

export const expectAggregateEvaluationEvent = ({
    body,
    variableKey,
    variationId,
    featureId,
    value,
    etag,
    rayId,
    lastModified,
    skipSDKConfigEvent,
}: {
    body: Record<string, unknown>
    variableKey: string
    featureId: string
    variationId: string
    etag: string
    rayId: string
    lastModified: string
    value?: number
    skipSDKConfigEvent?: boolean
}) => {
    const sdkName = getSDKName()
    const expectedPlatform = getPlatformBySdkName(sdkName)
    const metadata: Record<string, unknown> = {
        _feature: featureId,
        _variation: variationId,
    }
    const sdkPlatform = hasCapability(sdkName, Capabilities.sdkPlatform)
        ? SDKPlatformMap[sdkName]
        : undefined

    if (hasCapability(sdkName, Capabilities.etagReporting)) {
        metadata.configEtag = etag
        metadata.configRayId = rayId
        metadata.configLastModified = lastModified
        metadata.clientUUID = expect.any(String)
    }

    let optionalSDKConfigNewUser = []
    let optionalSDKConfigNewEvent = []
    if (!skipSDKConfigEvent) {
        if (hasCapability(sdkName, Capabilities.clientUUID)) {
            // user_id of sdkConfig and agg* events will be the same
            optionalSDKConfigNewEvent = addSDKConfigEventBatch(
                sdkName,
                expectedPlatform,
                sdkPlatform,
            )[0].events
        } else {
            optionalSDKConfigNewUser = addSDKConfigEventBatch(
                sdkName,
                expectedPlatform,
                sdkPlatform,
            )
        }
    }

    if (hasCapability(sdkName, Capabilities.eventsEvalReason)) {
        metadata.eval = expect.objectContaining({
            TARGETING_MATCH: expect.any(Number),
        })
    }

    expect(body).toEqual({
        batch: expect.toIncludeSameMembers([
            ...optionalSDKConfigNewUser,
            {
                user: {
                    ...optionalUserEventFields,
                    user_id: expect.any(String),
                    platform: expectedPlatform,
                    sdkType: 'server',
                    sdkPlatform: sdkPlatform,
                },
                events: expect.toIncludeSameMembers([
                    {
                        ...optionalEventFields,
                        user_id: expect.any(String),
                        type: 'aggVariableEvaluated',
                        target: variableKey,
                        metaData: metadata,
                        // featureVars is always empty for aggregated evaluation events
                        featureVars: {},
                        value: value !== undefined ? value : 1,
                        customType: expect.toBeNil(),
                    },
                    ...optionalSDKConfigNewEvent,
                ]),
            },
        ]),
    })
}

export const expectAggregateDefaultEvent = ({
    body,
    variableKey,
    defaultReason,
    value,
    etag,
    rayId,
    lastModified,
    skipSDKConfigEvent,
}: {
    body: Record<string, unknown>
    variableKey: string
    defaultReason: string
    etag?: string
    rayId?: string
    lastModified?: string
    value?: number
    skipSDKConfigEvent?: boolean
}) => {
    const sdkName = getSDKName()
    const expectedPlatform = getPlatformBySdkName(sdkName)
    const metadata: Record<string, unknown> = hasCapability(
        sdkName,
        Capabilities.defaultReason,
    )
        ? { defaultReason }
        : {}
    const sdkPlatform = hasCapability(sdkName, Capabilities.sdkPlatform)
        ? SDKPlatformMap[sdkName]
        : undefined

    if (hasCapability(sdkName, Capabilities.etagReporting)) {
        if (etag) {
            metadata.configEtag = etag
        }
        if (rayId) {
            metadata.configRayId = rayId
        }
        if (lastModified) {
            metadata.configLastModified = lastModified
        }
        metadata.clientUUID = expect.any(String)
    }

    let optionalSDKConfigNewUser = []
    let optionalSDKConfigNewEvent = []
    if (!skipSDKConfigEvent) {
        if (hasCapability(sdkName, Capabilities.clientUUID)) {
            // user_id of sdkConfig and agg* events will be the same
            optionalSDKConfigNewEvent = addSDKConfigEventBatch(
                sdkName,
                expectedPlatform,
                sdkPlatform,
            )[0].events
        } else {
            optionalSDKConfigNewUser = addSDKConfigEventBatch(
                sdkName,
                expectedPlatform,
                sdkPlatform,
            )
        }
    }

    if (hasCapability(sdkName, Capabilities.eventsEvalReason)) {
        // Included in this capability as it included in the same PR
        metadata._variation = 'DEFAULT'
        metadata.eval = {
            DEFAULT: value !== undefined ? value : 1,
        }
    }

    expect(body).toEqual({
        batch: expect.arrayContaining([
            ...optionalSDKConfigNewUser,
            {
                user: {
                    ...optionalUserEventFields,
                    user_id: expect.any(String),
                    platform: expectedPlatform,
                    sdkType: 'server',
                    sdkPlatform: sdkPlatform,
                },
                events: expect.arrayContaining([
                    ...optionalSDKConfigNewEvent,
                    {
                        ...optionalEventFields,
                        user_id: expect.any(String),
                        type: 'aggVariableDefaulted',
                        target: variableKey,
                        metaData: Object.keys(metadata).length
                            ? metadata
                            : expect.toBeNil(),
                        // featureVars is always empty for aggregated evaluation events
                        featureVars: {},
                        value: value !== undefined ? value : 1,
                        customType: expect.toBeNil(),
                    },
                ]),
            },
        ]),
    })
}

export const interceptEvents = (
    scope: Scope,
    sdkName: string,
    eventsUrl: string,
) => {
    // The interceptor instance is used to wait on events that are triggered when calling
    // methods so that we can verify events being sent out and mock out responses from the
    // event server
    const interceptor = scope.post(eventsUrl)

    const eventResult = {
        body: {},
        wait: () =>
            waitForRequest(scope, interceptor, 600, 'Event callback timed out'),
    }

    interceptor.reply((uri, body) => {
        eventResult.body = body
        return [201, { message: 'Successfully received events.' }]
    })
    return eventResult
}
