export const getConnectionStringForProxy = (proxy: string) => {
    const container = global.__TESTCONTAINERS__.find((container) => container.name === proxy )

    if (!container) {
        throw new Error('Could not find container for proxy: ' + proxy)
    }

    return `http://${container.host}:${container.boundPorts.ports.get(3000)}`
}
