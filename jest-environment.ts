import { TestcontainersEnvironment } from '@trendyol/jest-testcontainers';

export class TestHarnessEnvrionment extends TestcontainersEnvironment {
    public async setup() {
        // TODO set up mock API server and assign chosen port to global variable
        await super.setup();
    }

    public async teardown() {
        // TODO teardown mock API server
        await super.teardown();
    }
}

export default TestHarnessEnvrionment
