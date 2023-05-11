export const Capabilities = {
    edgeDB: 'EdgeDB',
    events: 'Events',
    local: 'LocalBucketing',
    cloud: 'CloudBucketing',
    sse: 'SSE',
    clientCustomData: 'ClientCustomData',
    multithreading: 'Multithreading',
    variableValue: 'VariableValue',
    cloudProxy: 'CloudProxy',
}

export const SDKCapabilities = {
    NodeJS: [
        Capabilities.events, Capabilities.edgeDB, Capabilities.local, Capabilities.cloud, Capabilities.variableValue
    ],
    'OF-NodeJS': [
        Capabilities.events, Capabilities.edgeDB, Capabilities.local, Capabilities.cloud, Capabilities.variableValue
    ],
    Python: [
        Capabilities.events, Capabilities.cloud, Capabilities.edgeDB, Capabilities.variableValue
    ],
    DotNet: [
        Capabilities.events, Capabilities.cloud, Capabilities.local, Capabilities.edgeDB,
        Capabilities.clientCustomData, Capabilities.variableValue
    ],
    Java: [
        Capabilities.events, Capabilities.cloud, Capabilities.local, Capabilities.edgeDB, Capabilities.variableValue
    ],
    Go: [
        Capabilities.events, Capabilities.cloud, Capabilities.local, Capabilities.edgeDB, Capabilities.clientCustomData,
        Capabilities.multithreading, Capabilities.variableValue
    ],
    GoNative: [
        Capabilities.local, Capabilities.clientCustomData, Capabilities.events, Capabilities.variableValue
    ],
    Ruby: [
        Capabilities.events, Capabilities.local, Capabilities.clientCustomData, Capabilities.variableValue
    ],
    PHP: [
        Capabilities.events, Capabilities.local, Capabilities.cloudProxy
    ],

}
