export const Capabilities = {
    edgeDB: 'EdgeDB',
    events: 'Events',
    local: 'LocalBucketing',
    cloud: 'CloudBucketing',
    sse: 'SSE',
    clientCustomData: 'ClientCustomData',
    multithreading: 'Multithreading',
}

export const SDKCapabilities = {
    NodeJS: [Capabilities.events, Capabilities.edgeDB, Capabilities.local, Capabilities.cloud],
    Python: [Capabilities.events, Capabilities.cloud, Capabilities.edgeDB],
    DotNet: [Capabilities.events, Capabilities.cloud, Capabilities.local, Capabilities.edgeDB],
    Java: [Capabilities.events, Capabilities.cloud, Capabilities.local, Capabilities.edgeDB],
    Go: [Capabilities.events, Capabilities.cloud, Capabilities.local, Capabilities.edgeDB, Capabilities.clientCustomData, Capabilities.multithreading],
    GoNative: [Capabilities.local, Capabilities.clientCustomData, Capabilities.events],
    Ruby: [Capabilities.events, Capabilities.local, Capabilities.clientCustomData]
}
