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
        expect(SDKCapabilities).toMatchObject(expect.objectContaining({
            NodeJS: expect.arrayContaining(['EdgeDB', 'SSE', 'CloudBucketing']),
            Python: expect.arrayContaining(['ClientCustomData', 'V2Config']),
            Go: expect.arrayContaining([
                'CloudBucketing',
                'EdgeDB',
                'EtagReporting',
                'ClientCustomData',
                'LastModifiedHeader',
                'SDKConfigEvent',
                'ClientUUID',
                'V2Config',
                'EvalReason',
                'CloudEvalReason',
                'BaseEvalReason',
                'Multithreading',
                'EventsEvalReason',                
            ]),
        }))
    })

    it('should fallback to default capabilities for SDKs not specified in JSON object', () => {
        process.env.SDK_CAPABILITIES = JSON.stringify({
            NodeJS: ['edgeDB', 'sse'],
        })
        process.env.SDKS_TO_TEST = 'nodejs,go'
        const { SDKCapabilities } = jest.requireActual('./capabilities')
        expect(SDKCapabilities.NodeJS).toEqual(expect.arrayContaining(['EdgeDB', 'SSE']))
        expect(SDKCapabilities.Go).toEqual(expect.arrayContaining([
            'CloudBucketing',
            'EdgeDB',
            'EtagReporting',
            'ClientCustomData',
            'LastModifiedHeader',
            'SDKConfigEvent',
            'ClientUUID',
            'V2Config',
            'EvalReason',
            'CloudEvalReason',
            'BaseEvalReason',
            'Multithreading',
            'EventsEvalReason',
        ]))

    })
})
