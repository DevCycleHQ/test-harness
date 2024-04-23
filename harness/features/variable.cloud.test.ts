import {
  forEachVariableType,
  variablesForTypes,
  CloudTestClient,
  describeCapability,
  expectErrorMessageToBe,
  getSDKScope,
  cleanupCurrentClient,
} from "../helpers";
import { Capabilities, SDKCapabilities } from "../types";

describe("Variable Tests - Cloud", () => {
  // This helper method fetches the current SDK we are testing for the current jest project (see jest.config.js).
  // All supported SDKs can be found under harness/types/sdks.ts
  // it also returns our proxy scope that is used to mock endpoints that are called in the SDK.
  const { sdkName, scope } = getSDKScope();

  let testClient: CloudTestClient;

  beforeEach(async () => {
    testClient = new CloudTestClient(sdkName);
    // Creating a client will pass to the proxy server by default:
    // - sdk key based on the client id created when creating the client
    // - urls for the bucketing/config/events endpoints to redirect traffic
    // into the proxy server so nock can mock out the responses
    // - options like should wait for initialization, or should
    // expect it to error out
    await testClient.createClient({
      enableCloudBucketing: true,
    });
  });

  function callVariableMethod(method: string) {
    if (method === "variableValue") {
      return testClient.callVariableValue.bind(testClient);
    } else {
      return testClient.callVariable.bind(testClient);
    }
  }

  function expectVariableResponse(variable, method, expectObj) {
    expect(variable).toEqual(
      expect.objectContaining(
        method === "variable"
          ? expectObj
          : {
              data: expectObj.data?.value,
            },
      ),
    );
  }

  // This describeCapability only runs if the SDK has the "cloud" capability.
  // Capabilities are located under harness/types/capabilities and follow the same
  // name mapping from the sdks.ts file under harness/types/sdks.ts
  describeCapability(sdkName, Capabilities.cloud)(sdkName, () => {
    const hasVariableValue = SDKCapabilities[sdkName].includes(
      Capabilities.variableValue,
    );
    const callVariableMethods = hasVariableValue
      ? ["variable", "variableValue"]
      : ["variable"];

    // Skip variableValue tests that expect an error to be thrown, as OpenFeature doesn't throw exceptions.
    const ofTestSkip =
      sdkName === "OF-NodeJS"
        ? it.each(["variable"])
        : it.each(callVariableMethods);

    ofTestSkip(
      "will throw error %s called with invalid key",
      async (method) => {
        // Helper method calls the proxy server to trigger the "variable" method in
        // the SDK
        const variableResponse = await callVariableMethod(method)(
          { user_id: "user1" },
          sdkName,
          null,
          "string",
          "default_value",
          true,
        );
        const error = await variableResponse.json();
        // Helper method to equate error messages from the error object returned
        // from the proxy server
        expectErrorMessageToBe(error.asyncError, "Missing parameter: key");
      },
    );

    // TODO DVC-5954 investigate why these were failing on the SDKs
    it.skip.each(callVariableMethods)(
      "will throw error if %s called with invalid sdk key",
      async (method) => {
        scope
          .post(`/client/${testClient.clientId}/v1/variable/var_key`)
          .reply(401, { message: "Invalid sdk key" });

        // Helper method calls the proxy server to trigger the "variable" method in
        // the SDK
        const variableResponse = await callVariableMethod(method)(
          { user_id: "user1" },
          sdkName,
          "var_key",
          "string",
          "default_value",
          true,
        );
        const error = await variableResponse.json();
        // Helper method to equate error messages from the error object returned
        // from the proxy server
        expectErrorMessageToBe(error.asyncError, "Invalid sdk key");
      },
    );

    ofTestSkip(
      "will throw error %s called with invalid default value",
      async (method) => {
        const variableResponse = await callVariableMethod(method)(
          { user_id: "user1" },
          sdkName,
          "var_key",
          "string",
          null,
          true,
        );

        const error = await variableResponse.json();
        expectErrorMessageToBe(
          error.asyncError,
          "Missing parameter: defaultValue",
        );
      },
    );

    it.each(callVariableMethods)(
      "should call %s API without edgeDB option",
      async (method) => {
        // This allows us to mock out our specific client (using the clientId),
        // allowing us to have multiple mock APIs serving different clients without
        // conflicting. We can match on specific criteria, like headers and the query params
        // to specify which call we want to mock, and reply with a status code and an object
        // as a response
        scope
          .post(
            `/client/${testClient.clientId}/v1/variables/var_key`,
            (body) => body.user_id === "user1",
          )
          .matchHeader("Content-Type", "application/json")
          .matchHeader("authorization", testClient.sdkKey)
          .query((queryObj) => {
            return !queryObj.enableEdgeDB;
          })
          .reply(200, {
            key: "var_key",
            value: "value",
            defaultValue: "default_value",
            type: "String",
            isDefaulted: false,
          });
        const variableResponse = await callVariableMethod(method)(
          { user_id: "user1" },
          sdkName,
          "var_key",
          "string",
          "default_value",
        );
        await variableResponse.json();
      },
    );

    it.each(callVariableMethods)(
      "should call %s API with edgeDB option",
      async (method) => {
        await cleanupCurrentClient(scope);
        testClient = new CloudTestClient(sdkName);

        // Some tests require extra params for startup, so we can just create a new test client
        // for these specific tests.
        await testClient.createClient({
          enableCloudBucketing: true,
          enableEdgeDB: true,
        });

        scope
          .post(
            `/client/${testClient.clientId}/v1/variables/var_key`,
            (body) => body.user_id === "user1",
          )
          .matchHeader("Content-Type", "application/json")
          .matchHeader("authorization", testClient.sdkKey)
          .query((queryObj) => {
            return !!queryObj.enableEdgeDB;
          })
          .reply(200, {
            key: "var_key",
            value: "value",
            defaultValue: "default_value",
            type: "String",
            isDefaulted: false,
          });
        const variableResponse = await callVariableMethod(method)(
          { user_id: "user1" },
          sdkName,
          "var_key",
          "string",
          "default_value",
        );
        await variableResponse.json();
      },
    );

    it.each(callVariableMethods)(
      "should return default if mock server returns %s mismatching default value type",
      async (method) => {
        scope
          .post(
            `/client/${testClient.clientId}/v1/variables/var_key`,
            (body) => body.user_id === "user1",
          )
          .matchHeader("Content-Type", "application/json")
          .matchHeader("authorization", testClient.sdkKey)
          .reply(200, {
            key: "var_key",
            value: 5,
            type: "Number",
            isDefaulted: false,
          });

        const variableResponse = await callVariableMethod(method)(
          { user_id: "user1" },
          sdkName,
          "var_key",
          "string",
          variablesForTypes["string"].defaultValue,
        );
        const variable = await variableResponse.json();

        // We can expect that the object we mocked out earlier is going to be
        // what is returned to us from the proxy server and verify the entityType
        // is of type "Variable"
        expectVariableResponse(variable, method, {
          entityType: "Variable",
          data: {
            key: "var_key",
            value: variablesForTypes["string"].defaultValue,
            defaultValue: variablesForTypes["string"].defaultValue,
            type: variablesForTypes["string"].type,
            isDefaulted: true,
          },
        });
      },
    );

    // Instead of writing tests for each different type we support (String, Boolean, Number, JSON),
    // this function enumerates each type and runs all tests encapsulated within it to condense repeated tests.
    forEachVariableType((type) => {
      it.each(callVariableMethods)(
        `should return default ${type} %s if mock server returns undefined`,
        async (method) => {
          scope
            .post(
              `/client/${testClient.clientId}/v1/variables/var_key`,
              (body) => body.user_id === "user1",
            )
            .matchHeader("Content-Type", "application/json")
            .matchHeader("authorization", testClient.sdkKey)
            .reply(200, undefined);

          const variableResponse = await callVariableMethod(method)(
            { user_id: "user1" },
            sdkName,
            "var_key",
            "string",
            variablesForTypes[type].defaultValue,
          );
          const variable = await variableResponse.json();

          expectVariableResponse(variable, method, {
            entityType: "Variable",
            data: {
              key: "var_key",
              value: variablesForTypes[type].defaultValue,
              defaultValue: variablesForTypes[type].defaultValue,
              type: variablesForTypes[type].type,
              isDefaulted: true,
            },
          });
        },
      );

      it.each(callVariableMethods)(
        `should return ${type} %s if mock server returns \
                proper variable matching default value type`,
        async (method) => {
          scope
            .post(
              `/client/${testClient.clientId}/v1/variables/var_key`,
              (body) => body.user_id === "user1",
            )
            .matchHeader("Content-Type", "application/json")
            .matchHeader("authorization", testClient.sdkKey)
            .reply(200, variablesForTypes[type]);

          const variableResponse = await callVariableMethod(method)(
            { user_id: "user1" },
            sdkName,
            "var_key",
            type,
            variablesForTypes[type].defaultValue,
          );
          const variable = await variableResponse.json();

          expectVariableResponse(variable, method, {
            entityType: "Variable",
            data: {
              key: "var_key",
              value: variablesForTypes[type].value,
              defaultValue: variablesForTypes[type].defaultValue,
              isDefaulted: false,
              type: variablesForTypes[type].type,
            },
          });
        },
      );

      it.each(callVariableMethods)(
        `should return defaulted ${type} %s if mock server returns an internal error, \
                after retrying 5 times`,
        async (method) => {
          scope
            .post(
              `/client/${testClient.clientId}/v1/variables/var_key`,
              (body) => body.user_id === "user1",
            )
            .matchHeader("Content-Type", "application/json")
            .matchHeader("authorization", testClient.sdkKey)
            // SDK retries the request 5 times + 1 initial request
            .times(6)
            .reply(500);

          const variableResponse = await callVariableMethod(method)(
            { user_id: "user1" },
            sdkName,
            "var_key",
            type,
            variablesForTypes[type].defaultValue,
          );
          const variable = await variableResponse.json();

          expectVariableResponse(variable, method, {
            entityType: "Variable",
            data: {
              key: "var_key",
              value: variablesForTypes[type].defaultValue,
              isDefaulted: true,
              defaultValue: variablesForTypes[type].defaultValue,
              type: variablesForTypes[type].type,
            },
          });
        },
      );
    });
  });
});
