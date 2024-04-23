import {
  getConnectionStringForProxy,
  LocalTestClient,
  describeCapability,
  hasCapability,
  waitForRequest,
  getSDKScope,
} from "../helpers";
import { Capabilities } from "../types";
import { config } from "../mockData";

describe("Client Custom Data Tests", () => {
  const { sdkName, scope } = getSDKScope();

  let url: string;
  beforeAll(async () => {
    url = getConnectionStringForProxy(sdkName);
  });

  describeCapability(sdkName, Capabilities.clientCustomData)(sdkName, () => {
    it("should set client custom data and use it for segmentation", async () => {
      const client = new LocalTestClient(sdkName);

      scope
        .get(
          `/client/${client.clientId}/config/v1/server/${client.sdkKey}.json`,
        )
        .reply(200, config);

      if (hasCapability(sdkName, Capabilities.events)) {
        scope.post(`/client/${client.clientId}/v1/events/batch`).reply(201);
      }

      const customData = { "should-bucket": true };
      await client.createClient(true);
      await client.callSetClientCustomData(customData);
      const user = { user_id: "test-user" };
      const response = await client.callVariable(
        user,
        sdkName,
        "string-var",
        "string",
        "some-default",
      );
      const variable = await response.json();
      expect(variable).toEqual(
        expect.objectContaining({
          entityType: "Variable",
          data: {
            type: "String",
            isDefaulted: false,
            key: "string-var",
            defaultValue: "some-default",
            value: "string",
          },
        }),
      );
    });

    it("should do nothing when client has not initialized", async () => {
      const client = new LocalTestClient(sdkName);
      const configCall = scope.get(
        `/client/${client.clientId}/config/v1/server/${client.sdkKey}.json`,
      );

      configCall.delay(1000).reply(200, config);

      const customData = { "should-bucket": true };
      await client.createClient(false);
      await client.callSetClientCustomData(customData);
      await waitForRequest(scope, configCall, 1000, "Config request timed out");

      if (hasCapability(sdkName, Capabilities.events)) {
        scope.post(`/client/${client.clientId}/v1/events/batch`).reply(201);
      }

      const response = await client.callVariable(
        { user_id: "user-id" },
        sdkName,
        "string-var",
        "string",
        "some-default",
      );
      const variable = await response.json();
      expect(variable).toEqual(
        expect.objectContaining({
          entityType: "Variable",
          data: {
            type: "String",
            isDefaulted: true,
            key: "string-var",
            defaultValue: "some-default",
            value: "some-default",
          },
        }),
      );
    });
  });
});
