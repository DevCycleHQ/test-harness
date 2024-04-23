import { getSDKs } from './harness/helpers/helpers'
import testContainersSetup from '@eresearchqut/jest-testcontainers/dist/setup'

async function setup(opts) {
    const sdks = getSDKs()

    console.log(`Setting up test containers for SDKs: ${sdks.join(', ')}`)

    // COMPOSE_PROFILES controls which docker-compose services are run via their profiles setting in docker-compose.yml
    process.env.COMPOSE_PROFILES = sdks
        .map((sdkName: string) => sdkName.toLowerCase())
        .join(',')

    if (process.env.LOCAL_MODE === '1') {
        // Effectively disable all docker containers by setting a profile that none of them use
        process.env.COMPOSE_PROFILES = 'local'
    }

    console.log(`Set COMPOSE_PROFILES to ${process.env.COMPOSE_PROFILES}`)

    return await testContainersSetup(opts)
}

module.exports = setup
