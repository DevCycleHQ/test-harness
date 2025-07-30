import { getSDKs } from './sdks'

export const Capabilities = {
    edgeDB: 'EdgeDB',
    cloud: 'CloudBucketing',
    sse: 'SSE',
    clientCustomData: 'ClientCustomData',
    multithreading: 'Multithreading',
    defaultReason: 'DefaultReason',
    etagReporting: 'EtagReporting',
    cloudProxy: 'CloudProxy',
    lastModifiedHeader: 'LastModifiedHeader',
    bootstrapping: 'Bootstrapping',
    sdkConfigEvent: 'SDKConfigEvent',
    clientUUID: 'ClientUUID',
    v2Config: 'V2Config',
    sdkPlatform: 'SDKPlatform',
    variablesFeatureId: 'VariableFeatureId',
    cloudEvalReason: 'CloudEvalReason',
    evalReason: 'EvalReason',
    eventsEvalReason: 'EventsEvalReason',
    flagMetadata: 'flagMetadata',
    openFeature: 'OpenFeature',
}

export const SDKPlatformMap = {
    'OF-NodeJS': 'nodejs-of',
    'OF-DotNet': 'dotnet-of',
}

//TODO: when tests are updated for OF-NodeJS eval capability, remove concept of allVariables/allFeatures as a capability
let sdkCapabilities: { [key: string]: string[] } = {
    NodeJS: [
        Capabilities.edgeDB,
        Capabilities.cloud,
        Capabilities.lastModifiedHeader,
        Capabilities.bootstrapping,
        Capabilities.sdkConfigEvent,
        Capabilities.clientUUID,
        Capabilities.v2Config,
        Capabilities.clientCustomData,
        Capabilities.variablesFeatureId,
        Capabilities.cloudEvalReason,
        Capabilities.evalReason,
        Capabilities.eventsEvalReason,
    ],
    'OF-NodeJS': [
        Capabilities.edgeDB,
        Capabilities.cloud,
        Capabilities.lastModifiedHeader,
        Capabilities.sdkConfigEvent,
        Capabilities.clientUUID,
        Capabilities.v2Config,
        Capabilities.sdkPlatform,
        Capabilities.variablesFeatureId,
        Capabilities.cloudEvalReason,
        Capabilities.evalReason,
        Capabilities.eventsEvalReason,
        Capabilities.flagMetadata,
        Capabilities.openFeature,
    ],
    Python: [
        Capabilities.cloud,
        Capabilities.edgeDB,
        Capabilities.clientCustomData,
        Capabilities.v2Config,
    ],
    DotNet: [
        Capabilities.cloud,
        Capabilities.edgeDB,
        Capabilities.clientCustomData,
        Capabilities.v2Config,
        Capabilities.cloudEvalReason,
        Capabilities.evalReason,
        Capabilities.eventsEvalReason,
        //Capabilities.sdkConfigEvent,
        //Capabilities.clientUUID,
    ],
    'OF-DotNet': [
        Capabilities.cloud,
        Capabilities.edgeDB,
        Capabilities.clientCustomData,
        Capabilities.v2Config,
        Capabilities.cloudEvalReason,
        Capabilities.evalReason,
        Capabilities.eventsEvalReason,
        Capabilities.flagMetadata,
        Capabilities.openFeature,
    ],
    Java: [
        Capabilities.cloud,
        Capabilities.edgeDB,
        Capabilities.clientCustomData,
        Capabilities.v2Config,
        Capabilities.variablesFeatureId,
        Capabilities.cloudEvalReason,
        Capabilities.evalReason,
        Capabilities.eventsEvalReason,
    ],
    Go: [
        Capabilities.cloud,
        Capabilities.edgeDB,
        Capabilities.clientCustomData,
        Capabilities.multithreading,
        Capabilities.defaultReason,
        Capabilities.etagReporting,
        Capabilities.lastModifiedHeader,
        Capabilities.sdkConfigEvent,
        Capabilities.clientUUID,
        Capabilities.v2Config,
    ],
    Ruby: [
        Capabilities.clientCustomData,
        Capabilities.v2Config,
        Capabilities.variablesFeatureId,
        Capabilities.variablesFeatureId,
        Capabilities.cloudEvalReason,
        Capabilities.evalReason,
        Capabilities.eventsEvalReason,
    ],
    PHP: [Capabilities.cloudProxy],
}

export const getCapabilities = () => {
    const SDK_CAPABILITIES = process.env.SDK_CAPABILITIES

    if (!SDK_CAPABILITIES) {
        console.warn('No specified SDK Capabilities to test, running all tests')
        return Object.values(Capabilities)
    }

    try {
        const parsed = JSON.parse(SDK_CAPABILITIES)
        if (Array.isArray(parsed)) {
            return parsed.map((capability) => Capabilities[capability])
        } else if (typeof parsed === 'object' && parsed !== null) {
            // Return as-is for per-SDK logic
            return Object.fromEntries(
                Object.entries(parsed).map(([sdk, caps]) => [
                    sdk,
                    Array.isArray(caps)
                        ? caps.map((cap) => Capabilities[cap]).filter(Boolean)
                        : [],
                ]),
            )
        }
    } catch (e) {
        if (SDK_CAPABILITIES && Capabilities[SDK_CAPABILITIES]) {
            return [Capabilities[SDK_CAPABILITIES]]
        } else if (SDK_CAPABILITIES) {
            return SDK_CAPABILITIES.split(',')
                .map((capability) => Capabilities[capability])
                .filter((capability) => capability !== undefined)
        }
    }
    return Object.values(Capabilities)
}

if (process.env.SDK_CAPABILITIES && process.env.SDKS_TO_TEST) {
    const sdks: string[] = getSDKs()
    const capabilities = getCapabilities()
    if (Array.isArray(capabilities)) {
        sdkCapabilities = sdks.reduce((acc, sdk) => {
            acc[sdk] = capabilities
            return acc
        }, {})
    } else if (typeof capabilities === 'object' && capabilities !== null) {
        sdkCapabilities = sdks.reduce((acc, sdk) => {
            acc[sdk] = capabilities[sdk] || sdkCapabilities[sdk] || []
            return acc
        }, {})
    }
}

export const SDKCapabilities = sdkCapabilities
