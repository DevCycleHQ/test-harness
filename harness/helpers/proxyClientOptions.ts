import { getMockServerUrl } from './helpers'

export type ProxyClientOptions = {
    eventsAPIURI?: string
    configCDNURI?: string
    bucketingAPIURI?: string
    enableEdgeDB?: boolean
    configPollingIntervalMS?: number
    eventFlushIntervalMS?: number
    enableCloudBucketing?: boolean
    enableRealtimeUpdates?: boolean
    disableRealtimeUpdates?: boolean
    logLevel?: string
    enableClientBootstrapping?: boolean
}
