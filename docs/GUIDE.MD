# How To Write Test Harness Tests

_Refer to the Variable Cloud tests and Variable Local tests on how to write tests for both Cloud and Local bucketing._

![Architecture overview of the test harness](https://user-images.githubusercontent.com/10345366/211103174-93507d88-814f-4177-bbb3-392830e6a280.png)

The test harness is built using `jest-testcontainers` which can run docker containers that can be used in our tests. The test harness uses it to spin up
proxy servers, written in the language they are meant to test.The `docker-compose.yml` file lists the images that are to be spun up when the tests start up.
There is also `jest-environment.ts` where some globals are set up and where the mock API server is setup and torn down. The global setup used by `jest-testcontainers` is wrapped in `jest-global.ts` to set the profiles used by docker-compose. This limits which containers are actually built and run based on their `profiles` setting.

The tests send commands to the proxy server through http requests, the spec of which you can find at `docs/spec.yaml`. The proxy server then calls the SDK based on the request from the test harness and will respond back with the results to the test harness. The SDK is also configured by the test harness to point all API calls to the mock server using `nock`; the proxy server initializes the SDK with options that change the base URL to the urls passed by the proxy server. This allows us to mock API calls from the SDK.

Tests are divided into separate features that are present in each SDK tested by the test harness. The tests are located under
`harness/features/`. There are also helper methods located under `harness/helpers.ts` that can be used to create SDK clients, call certain
features on the proxy server and return the response, etc.

An important helper method is the `getSDKScope` helper method, which returns the currently running SDK name for the current jest project.
You can see all the jest projects in `jest.config.js`. All SDK types are defined in: `harness/types/sdks.ts`.

Another useful method is to wrap tests with a `describeCapability` function, passing in a capability listed under `harness/types/capabilities.ts`.
This is used to segment different SDKs with different tests that are present on some SDKs but not all, e.g. Python not having a local bucketing capability.

Lastly, we use `nock` to mock out server responses sent from the SDK. This allows to stub out certain methods on different URLs and return data objects.

```
e.g. This stubs out any calls from the SDK for the /variables endpoint with the specific variable key "var_key" and returns a variable object.

Note: we can also granularly match on query params, this example matches on if the "enableEdgeDb" query param is set.
Note: If you create a mock using nock, it will fail if that URL was not called at all
scope
    .post(`/client/${testClient.clientId}/v1/variables/var_key`, (body) => body.user_id === 'user1')
    .matchHeader('Content-Type', 'application/json')
    .matchHeader('authorization', testClient.sdkKey)
    .query((queryObj) => {
        return !!queryObj.enableEdgeDB
    })
    .reply(200, {
        key: 'var_key',
        value: 'value',
        defaultValue: 'default_value',
        type: 'String',
        isDefaulted: false
    })
```

We can then use our helper methods to call the `variable` method on our proxy servers:

```
const variableResponse = await testClient.callVariable(
    { user_id: 'user1' },
    sdkName,
    'var_key',
    'string',
    'default_value'
)
const response = await variableResponse()
```
