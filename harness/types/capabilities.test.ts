import { Sdks } from './sdks'

describe('SDKCapabilities Unit Tests', () => {
    afterEach(() => {
        jest.resetModules()
    })

    it('should load capabilities from env variables', () => {
        process.env.SDK_CAPABILITIES = 'edgeDB,cloud,clientCustomData,sse'
        process.env.SDKS_TO_TEST = 'NodeJS,Python'
        const { SDKCapabilities } = jest.requireActual('../capabilities')
        expect(SDKCapabilities).toEqual({
            NodeJS: ['edgeDB', 'cloud', 'clientCustomData', 'sse'],
            Python: ['edgeDB', 'cloud', 'clientCustomData', 'sse'],
        })
    })

    it('should load capabilities from env variables as JSON', () => {
        process.env.SDK_CAPABILITIES =
            '["edgeDB","cloud","clientCustomData","sse"]'
        process.env.SDKS_TO_TEST = '["NodeJS","Python"]'
        const { SDKCapabilities } = jest.requireActual('../capabilities')
        expect(SDKCapabilities).toEqual({
            NodeJS: ['edgeDB', 'cloud', 'clientCustomData', 'sse'],
            Python: ['edgeDB', 'cloud', 'clientCustomData', 'sse'],
        })
    })

    it('should use default capabilities if env variables are not set', () => {
        process.env.SDK_CAPABILITIES = 'edgeDB,cloud,clientCustomData,sse'
        const { SDKCapabilities } = jest.requireActual('../capabilities')
        expect(Object.keys(SDKCapabilities)).toEqual(Object.values(Sdks))
    })
})
