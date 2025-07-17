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

    it('should load per-SDK capabilities from env variables as JSON object', () => {
        process.env.SDK_CAPABILITIES = JSON.stringify({
            NodeJS: ['edgeDB', 'sse', 'cloud'],
            Python: ['clientCustomData', 'v2Config'],
        })
        process.env.SDKS_TO_TEST = 'nodejs,python,go'
        const { SDKCapabilities } = jest.requireActual('./capabilities')
        expect(SDKCapabilities).toEqual({
            NodeJS: ['EdgeDB', 'SSE', 'CloudBucketing'],
            Python: ['ClientCustomData', 'V2Config'],
            Go: [
                'CloudBucketing',
                'EdgeDB',
                'ClientCustomData',
                'Multithreading',
                'DefaultReason',
                'EtagReporting',
                'LastModifiedHeader',
                'SDKConfigEvent',
                'ClientUUID',
                'V2Config',
                'AllVariables',
                'AllFeatures',
            ],
        })
    })

    it('should fallback to default capabilities for SDKs not specified in JSON object', () => {
        process.env.SDK_CAPABILITIES = JSON.stringify({
            NodeJS: ['edgeDB', 'sse'],
        })
        process.env.SDKS_TO_TEST = 'nodejs,go'
        const { SDKCapabilities } = jest.requireActual('./capabilities')
        expect(SDKCapabilities.NodeJS).toEqual(['EdgeDB', 'SSE'])
        expect(SDKCapabilities.Go).toEqual([
            'CloudBucketing',
            'EdgeDB',
            'ClientCustomData',
            'Multithreading',
            'DefaultReason',
            'EtagReporting',
            'LastModifiedHeader',
            'SDKConfigEvent',
            'ClientUUID',
            'V2Config',
            'AllVariables',
            'AllFeatures',
        ])
    })
})
