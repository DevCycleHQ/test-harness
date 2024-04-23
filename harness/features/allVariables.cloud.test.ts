import {
  getConnectionStringForProxy,
  CloudTestClient,
  describeCapability,
  expectErrorMessageToBe,
  getSDKScope,
} from "../helpers";
import { Capabilities } from "../types";
import { variables } from "../mockData";

describe("allVariables Tests - Cloud", () => {
  const { sdkName, scope } = getSDKScope();
  console.log(`Running allVariables tests for ${sdkName}`);

  let url: string;

  let client: CloudTestClient;

  beforeEach(async () => {
    client = new CloudTestClient(sdkName);
    url = getConnectionStringForProxy(sdkName);
    await client.createClient();
  });

  describeCapability(sdkName, Capabilities.cloud)(sdkName, () => {
    it("should return an empty object if variables request fails", async () => {
      scope
        .persist() // need to persist because the client will retry on 500
        .post(`/client/${client.clientId}/v1/variables`)
        .reply(500);

      const response = await client.callAllVariables({
        user_id: "test_user",
        email: "user@gmail.com",
      });
      const { data: variablesMap } = await response.json();

      expect(variablesMap).toMatchObject({});
    });

    it("should throw if variables request fails on user error", async () => {
      scope
        .post(`/client/${client.clientId}/v1/variables`)
        .reply(401, { message: "Invalid sdk token" });

      const response = await client.callAllVariables(
        {
          user_id: "test_user",
          email: "user@gmail.com",
        },
        true,
      );
      const res = await response.json();
      expectErrorMessageToBe(
        res.asyncError,
        "Invalid sdk token",
        "Invalid SDK Key",
      );
    });

    it("should return a variable map", async () => {
      scope
        .post(`/client/${client.clientId}/v1/variables`)
        .reply(200, variables);
      const response = await client.callAllVariables({
        user_id: "test_user",
        email: "user@gmail.com",
      });
      const { data: variablesMap, entityType } = await response.json();

      expect(entityType).toEqual("Object");
      expect(variablesMap).toEqual(variables);
    });

    it("should make a request to the variables endpoint with edgeDB param to false", async () => {
      scope
        .post(`/client/${client.clientId}/v1/variables`)
        .query((queryObj) => {
          return !queryObj.enableEdgeDB;
        })
        .reply(200, variables);

      await client.callAllVariables({
        user_id: "test_user",
        email: "user@gmail.com",
      });
    });

    it("should make a request to the variables endpoint with edgeDB param to true", async () => {
      const client = new CloudTestClient(sdkName);
      scope
        .post(`/client/${client.clientId}/v1/variables`)
        .query((queryObj) => {
          return queryObj.enableEdgeDB === "true";
        })
        .reply(200, variables);

      await client.createClient({
        enableEdgeDB: true,
      });

      await client.callAllVariables({
        user_id: "test_user",
        email: "user@gmail.com",
      });
    });
  });
  // })
});
