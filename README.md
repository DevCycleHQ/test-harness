# test-harness
The shared test harness for testing DevCycle SDKs

## Running the harness against a local SDK
- Have SDK saved in same parent directory as test harness
- Comment out whatever proxy server you want to run locally in `docker-compose.yml`
- Change `getConnectionStringForProxy` to return `http://localhost:3000`
- Change `getMockServerUrl` to return `http://localhost:${global.__MOCK_SERVER_PORT__}`
- Follow the instructions to point to a local SDK for whatever language you’re using. See [this document](https://www.notion.so/taplytics/How-to-run-example-apps-against-local-SDKs-for-testing-18da8452603246968f8550cc808b8f30)
