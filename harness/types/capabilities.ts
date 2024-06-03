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
}

export const SDKCapabilities = {
    NodeJS: [
        Capabilities.edgeDB,
        Capabilities.cloud,
        Capabilities.lastModifiedHeader,
        Capabilities.bootstrapping,
        Capabilities.sdkConfigEvent,
        Capabilities.clientUUID,
    ],
    'OF-NodeJS': [
        Capabilities.edgeDB,
        Capabilities.cloud,
        Capabilities.lastModifiedHeader,
        Capabilities.sdkConfigEvent,
        Capabilities.clientUUID,
    ],
    Python: [
        Capabilities.cloud,
        Capabilities.edgeDB,
        Capabilities.clientCustomData,
    ],
    DotNet: [
        Capabilities.cloud,
        Capabilities.edgeDB,
        Capabilities.clientCustomData,
    ],
    Java: [
        Capabilities.cloud,
        Capabilities.edgeDB,
        Capabilities.clientCustomData,
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
    ],
    Ruby: [Capabilities.clientCustomData],
    PHP: [Capabilities.cloudProxy],
}
