import { getSDKs } from './harness/types'
import testContainersSetup from '@eresearchqut/jest-testcontainers/dist/setup'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function checkDockerCommand() {
    try {
        await execAsync('docker compose version')
        return 'docker compose'
    } catch {
        try {
            await execAsync('docker-compose version')
            return 'docker-compose'
        } catch {
            throw new Error(
                'Neither docker compose nor docker-compose commands are available',
            )
        }
    }
}

async function setup(opts) {
    const sdks = getSDKs()

    console.log(`Setting up test containers for SDKs: ${sdks.join(', ')}`)

    // COMPOSE_PROFILES controls which docker-compose services are run via their profiles setting in docker-compose.yml
    process.env.COMPOSE_PROFILES = sdks
        .map((sdkName: string) => sdkName.toLowerCase())
        .join(',')

    if (process.env.LOCAL_MODE === '1') {
        // In LOCAL_MODE, we don't need to set up any containers
        return Promise.resolve()
    }

    try {
        // Check which docker compose command is available and set it in the environment
        process.env.DOCKER_COMPOSE_COMMAND = await checkDockerCommand()
        console.log(`Using ${process.env.DOCKER_COMPOSE_COMMAND} command`)
    } catch (error) {
        console.error('Docker compose command check failed:', error.message)
        throw error
    }

    console.log(`Set COMPOSE_PROFILES to ${process.env.COMPOSE_PROFILES}`)

    return await testContainersSetup(opts)
}

module.exports = setup
