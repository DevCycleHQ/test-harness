describe('SDKCapabilities Unit Tests', () => {
    afterEach(() => {
        jest.resetModules()
    })

    it('should load capabilities from env variables', () => {
        process.env.SDK_CAPABILITIES = 'edgeDB,cloud,clientCustomData,sse'
        process.env.SDKS_TO_TEST = 'nodejs,python'
        const { SDKCapabilities } = jest.requireActual('./capabilities')
        expect(SDKCapabilities).toEqual({
            NodeJS: ['EdgeDB', 'CloudBucketing', 'ClientCustomData', 'SSE'],
            Python: ['EdgeDB', 'CloudBucketing', 'ClientCustomData', 'SSE'],
        })
    })

    it('should load capabilities from env variables as JSON', () => {
        process.env.SDK_CAPABILITIES =
            '["edgeDB","cloud","clientCustomData","sse"]'
        process.env.SDKS_TO_TEST = '["nodejs","python"]'
        const { SDKCapabilities } = jest.requireActual('./capabilities')
        expect(SDKCapabilities).toEqual({
            NodeJS: ['EdgeDB', 'CloudBucketing', 'ClientCustomData', 'SSE'],
            Python: ['EdgeDB', 'CloudBucketing', 'ClientCustomData', 'SSE'],
        })
    })

    it('should use default capabilities if env variables are not set', () => {
        process.env.SDK_CAPABILITIES = 'edgeDB,cloud,clientCustomData,sse'
        delete process.env.SDKS_TO_TEST
        const { SDKCapabilities } = jest.requireActual('./capabilities')
        const { Sdks } = jest.requireActual('./sdks')
        expect(Object.keys(SDKCapabilities)).toEqual(
            expect.arrayContaining(Object.values(Sdks)),
        )
    })
})
