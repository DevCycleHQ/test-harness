export type ProxyClientOptions = {
    eventsAPIURI?: string
    configCDNURI?: string
    bucketingAPIURI?: string
    enableEdgeDB?: boolean
    configPollingIntervalMS?: number
    eventFlushIntervalMS?: number
    enableCloudBucketing?: boolean
    enableRealtimeUpdates?: boolean
    logLevel?: string
    enableClientBootstrapping?: boolean
    enableSSE?: boolean
}
