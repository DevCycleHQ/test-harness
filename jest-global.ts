import { getSDKs } from './harness/types'
import testContainersSetup from '@eresearchqut/jest-testcontainers/dist/setup'

async function setup(opts) {
    const sdks = getSDKs()

    console.log(`Setting up test containers for SDKs: ${sdks.join(', ')}`)

    if (process.env.LOCAL_MODE === '1') {
        console.log('LOCAL_MODE=1 detected, skipping Docker container setup')
        console.log('Expecting proxy to be running manually on localhost:3000')

        // Set up minimal globals to prevent teardown errors
        // The teardown expects global.__TESTCONTAINERS__ to be an array
        global.__TESTCONTAINERS__ = []
        return
    }

    // COMPOSE_PROFILES controls which docker-compose services are run via their profiles setting in docker-compose.yml
    process.env.COMPOSE_PROFILES = sdks
        .map((sdkName: string) => sdkName.toLowerCase())
        .join(',')

    console.log(`Set COMPOSE_PROFILES to ${process.env.COMPOSE_PROFILES}`)

    return await testContainersSetup(opts)
}

module.exports = setup
