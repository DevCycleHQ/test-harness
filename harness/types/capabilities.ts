export const Capabilities = {
    edgeDB: 'EdgeDB',
    local: 'LocalBucketing',
    cloud: 'CloudBucketing',
    sse: 'SSE'
}

export const SDKCapabilities = {
    NodeJS: [Capabilities.edgeDB, Capabilities.local, Capabilities.cloud]
}
