import {
  waitForRequest,
  CloudTestClient,
  describeCapability,
  expectErrorMessageToBe,
  getPlatformBySdkName,
  getSDKScope,
} from "../helpers";
import { Capabilities } from "../types";

describe("Track Tests - Cloud", () => {
  const { sdkName, scope } = getSDKScope();
  const validUserId = "user1";

  const expectedPlatform = getPlatformBySdkName(sdkName);

  let client: CloudTestClient;

  beforeEach(async () => {
    client = new CloudTestClient(sdkName);
    await client.createClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describeCapability(sdkName, Capabilities.cloud)(sdkName, () => {
    it("should complain if event type not set", async () => {
      const trackResponse = await client.callTrack(
        { user_id: validUserId },
        { target: 1 },
        true,
      );
      const res = await trackResponse.json();
      expectErrorMessageToBe(res.asyncError, "Invalid Event");
    });

    it("should call events API to track event", async () => {
      let eventBody = {};
      const eventType = "pageNavigated";
      const variableId = "string-var";
      const value = 1;

      const interceptor = scope.post(`/client/${client.clientId}/v1/track`);

      interceptor.matchHeader("Content-Type", "application/json");
      interceptor.reply((uri, body) => {
        eventBody = body;
        return [201, { success: true }];
      });

      await client.callTrack(
        { user_id: validUserId },
        { type: eventType, target: variableId, value },
      );

      await waitForRequest(scope, interceptor, 550, "Event callback timed out");

      expectEventBody(eventBody, variableId, eventType, value);
    });

    it("should retry events API on failed request", async () => {
      let eventBody = {};

      const eventType = "buttonClicked";
      const variableId = "json-var";
      const value = 1;

      scope
        .post(`/client/${client.clientId}/v1/track`)
        .matchHeader("Content-Type", "application/json")
        .reply(519, {});

      const interceptor = scope.post(`/client/${client.clientId}/v1/track`);
      interceptor.matchHeader("Content-Type", "application/json");
      interceptor.reply((uri, body) => {
        eventBody = body;
        return [201, { success: true }];
      });

      const trackResponse = await client.callTrack(
        { user_id: validUserId },
        { type: eventType, target: variableId, value },
      );

      await trackResponse.json();

      await waitForRequest(scope, interceptor, 550, "Event callback timed out");

      expectEventBody(eventBody, variableId, eventType, value);
    });

    it("should throw if track request fails on invalid sdk key", async () => {
      scope
        .post(`/client/${client.clientId}/v1/track`)
        .reply(401, { message: "Invalid sdk key" });

      const response = await client.callTrack(
        {
          user_id: "user1",
        },
        { type: "eventType" },
        true,
      );
      const res = await response.json();
      expectErrorMessageToBe(
        res.asyncError,
        "Invalid sdk key",
        "Invalid SDK Key",
      );
    });
  });

  const expectEventBody = (
    body: Record<string, unknown>,
    variableId: string,
    eventType: string,
    value?: number,
  ) => {
    expect(body).toEqual({
      user: expect.objectContaining({
        platform: expectedPlatform,
        sdkType: "server",
        user_id: validUserId,
      }),
      events: [
        expect.objectContaining({
          type: eventType,
          target: variableId,
          value: value !== undefined ? value : 1,
        }),
      ],
    });
  };
});
