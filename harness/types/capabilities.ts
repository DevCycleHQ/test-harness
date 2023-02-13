export const Capabilities = {
    edgeDB: 'EdgeDB',
    local: 'LocalBucketing',
    cloud: 'CloudBucketing',
    sse: 'SSE',
    clientCustomData: 'ClientCustomData',
}

export const SDKCapabilities = {
    NodeJS: [Capabilities.edgeDB, Capabilities.local, Capabilities.cloud],
    Python: [Capabilities.cloud, Capabilities.edgeDB],
    DotNet: [Capabilities.cloud, Capabilities.local, Capabilities.edgeDB],
    Java: [Capabilities.cloud, Capabilities.local, Capabilities.edgeDB],
    Go: [Capabilities.cloud, Capabilities.local, Capabilities.edgeDB, Capabilities.clientCustomData],
}
