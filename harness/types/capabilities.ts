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
}

export const SDKPlatformMap = {
    'OF-NodeJS': 'nodejs-of',
}

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
    ],
    'OF-NodeJS': [
        Capabilities.edgeDB,
        Capabilities.cloud,
        Capabilities.lastModifiedHeader,
        Capabilities.sdkConfigEvent,
        Capabilities.clientUUID,
        Capabilities.v2Config,
        Capabilities.sdkPlatform,
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
        //Capabilities.sdkConfigEvent,
        //Capabilities.clientUUID,
    ],
    Java: [
        Capabilities.cloud,
        Capabilities.edgeDB,
        Capabilities.clientCustomData,
        Capabilities.v2Config,
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
    Ruby: [Capabilities.clientCustomData, Capabilities.v2Config],
    PHP: [Capabilities.cloudProxy],
}

export const getCapabilities = () => {
    const SDK_CAPABILITIES = process.env.SDK_CAPABILITIES

    try {
        return JSON.parse(SDK_CAPABILITIES ?? '').map(
            (sdk) => Capabilities[sdk],
        )
    } catch (e) {
        if (SDK_CAPABILITIES && Capabilities[SDK_CAPABILITIES]) {
            return [Capabilities[SDK_CAPABILITIES]]
        } else if (SDK_CAPABILITIES) {
            return SDK_CAPABILITIES.split(',')
                .map((capability) => Capabilities[capability])
                .filter((capability) => capability !== undefined)
        } else {
            console.warn(
                'No specified SDK Capabilities to test, running all tests',
            )
            return Object.values(Capabilities)
        }
    }
}

if (process.env.SDK_CAPABILITIES && process.env.SDKS_TO_TEST) {
    const sdks: string[] = getSDKs()
    const capabilities: string[] = getCapabilities()
    sdkCapabilities = sdks.reduce((acc, sdk) => {
        acc[sdk] = capabilities
        return acc
    }, {})
}

export const SDKCapabilities = sdkCapabilities
