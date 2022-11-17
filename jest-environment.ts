import { TestcontainersEnvironment } from '@trendyol/jest-testcontainers';
import { initialize } from './harness/mockServer'

export class TestHarnessEnvironment extends TestcontainersEnvironment {
    server: any

    constructor(config: any, context: any) {
        super(config, context);
    }

    public async setup() {
        this.server = await initialize()
        this.global.__MOCK_SERVER_PORT__ = this.server.address().port
        await super.setup();
    }

    public async teardown() {
        if (this.server) {
            await new Promise(resolve => {
                this.server.close(resolve)
            })
        }

        await super.teardown();
    }
}

export default TestHarnessEnvironment
