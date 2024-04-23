import {
  getConnectionStringForProxy,
  wait,
  waitForRequest,
  LocalTestClient,
  describeCapability,
  expectErrorMessageToBe,
  getPlatformBySdkName,
  getSDKScope,
} from "../helpers";
import { Capabilities } from "../types";
import { config } from "../mockData";
import {
  optionalEventFields,
  optionalUserEventFields,
} from "../mockData/events";

describe("Track Tests - Local", () => {
  const { sdkName, scope } = getSDKScope();
  const validUserId = "user1";

  const expectedPlatform = getPlatformBySdkName(sdkName);

  let url: string;
  const eventFlushIntervalMS = 1000;

  describeCapability(
    sdkName,
    Capabilities.local,
    Capabilities.events,
  )(sdkName, () => {
    let client: LocalTestClient;

    beforeEach(async () => {
      client = new LocalTestClient(sdkName);
      url = getConnectionStringForProxy(sdkName);

      scope
        .get(
          `/client/${client.clientId}/config/v1/server/${client.sdkKey}.json`,
        )
        .reply(200, config);

      await client.createClient(true, {
        eventFlushIntervalMS: eventFlushIntervalMS,
        logLevel: "debug",
        configPollingIntervalMS: 1000 * 60,
      });
    });

    describe("Expect no events sent", () => {
      it("should not send an event if the event type not set", async () => {
        const trackResponse = await client.callTrack(
          { user_id: validUserId },
          {},
          true,
        );

        const res = await trackResponse.json();
        expectErrorMessageToBe(res.exception, "Missing parameter: type");

        // wait for 2 event flush to ensure no flush happens, if it fails it will get caught by
        // the global assertNoUnmatchedRequests and fail this testcase
        await wait(eventFlushIntervalMS * 2);
      });
    });

    describe("Expect events sent", () => {
      it("should call events API to track event", async () => {
        let eventBody = {};
        const eventType = "pageNavigated";
        const variableId = "string-var";
        const value = 1;

        const interceptor = scope.post(
          `/client/${client.clientId}/v1/events/batch`,
        );
        interceptor.reply((uri, body) => {
          eventBody = body;
          return [201, { message: "Successfully received events." }];
        });

        const trackResponse = await client.callTrack(
          { user_id: validUserId },
          { type: eventType, target: "string-var", value: value },
        );

        await trackResponse.json();
        await waitForRequest(
          scope,
          interceptor,
          eventFlushIntervalMS * 2,
          "Event callback timed out",
        );

        expect(eventBody).toEqual({
          batch: [
            {
              user: {
                ...optionalUserEventFields,
                platform: expectedPlatform,
                sdkType: "server",
                user_id: validUserId,
              },
              events: [
                {
                  ...optionalEventFields,
                  type: "customEvent",
                  featureVars: {
                    "6386813a59f1b81cc9e6c68d": "6386813a59f1b81cc9e6c693",
                  },
                  metaData: expect.toBeNil(),
                  customType: eventType,
                  target: variableId,
                  value: value,
                  user_id: validUserId,
                },
              ],
            },
          ],
        });
      });

      it("should call events API to track 2 events", async () => {
        let eventBody = {};
        // const eventType = 'buttonClicked'
        const eventType = "buttonClicked";
        const variableId = "string-var";
        const value = 2;

        // const eventType2 = 'textChanged'
        const eventType2 = "textChanged";
        const variableId2 = "json-var";
        const value2 = 3;

        const interceptor = scope.post(
          `/client/${client.clientId}/v1/events/batch`,
        );
        interceptor.reply((uri, body) => {
          eventBody = body;
          return [201, { message: "Successfully received events." }];
        });

        await client.callTrack(
          { user_id: validUserId },
          { type: eventType, target: variableId, value: value },
        );
        await client.callTrack(
          { user_id: validUserId },
          { type: eventType2, target: variableId2, value: value2 },
        );

        await waitForRequest(
          scope,
          interceptor,
          eventFlushIntervalMS * 2,
          "Event callback timed out",
        );

        expect(eventBody).toEqual({
          batch: [
            {
              user: {
                ...optionalUserEventFields,
                platform: expectedPlatform,
                sdkType: "server",
                user_id: validUserId,
              },
              events: [
                {
                  ...optionalEventFields,
                  type: "customEvent",
                  featureVars: {
                    "6386813a59f1b81cc9e6c68d": "6386813a59f1b81cc9e6c693",
                  },
                  metaData: expect.toBeNil(),
                  customType: eventType,
                  target: variableId,
                  value: value,
                  user_id: validUserId,
                },
                {
                  ...optionalEventFields,
                  type: "customEvent",
                  featureVars: {
                    "6386813a59f1b81cc9e6c68d": "6386813a59f1b81cc9e6c693",
                  },
                  metaData: expect.toBeNil(),
                  customType: eventType2,
                  target: variableId2,
                  value: value2,
                  user_id: validUserId,
                },
              ],
            },
          ],
        });
      });

      it("should retry events API call to track 2 events and check interval of events is in specified window", async () => {
        let eventBody = {};
        const timestamps = [];
        // const eventType = 'buttonClicked'
        const eventType = "buttonClicked";
        const variableId = "string-var";
        const value = 2;

        // const eventType2 = 'textChanged'
        const eventType2 = "textChanged";
        const variableId2 = "json-var";
        const value2 = 3;

        let startDate = Date.now();
        scope
          .post(`/client/${client.clientId}/v1/events/batch`)
          .matchHeader("Content-Type", "application/json")
          .times(2)
          .reply((uri, body) => {
            timestamps.push(Date.now() - startDate);
            startDate = Date.now();
            return [519];
          });

        const interceptor = scope.post(
          `/client/${client.clientId}/v1/events/batch`,
        );
        interceptor.reply((uri, body) => {
          eventBody = body;
          timestamps.push(Date.now() - startDate);
          return [201, { message: "Successfully received events." }];
        });

        await client.callTrack(
          { user_id: validUserId },
          { type: eventType, target: variableId, value: value },
        );
        await client.callTrack(
          { user_id: validUserId },
          { type: eventType2, target: variableId2, value: value2 },
        );

        await waitForRequest(
          scope,
          interceptor,
          eventFlushIntervalMS * 5,
          "Event callback timed out",
        );
        //wait for a total of 2(failed) 1(passed) and 2 extra flushes (safety) to happen
        //this is to ensure that another flush does not happen
        //as it would be caught globally and fail this test case
        //the extra flush would be caught by the global assertNoUnmatchedRequests

        let total = 0;
        for (let i = 0; i < timestamps.length; i++) {
          const time = timestamps[i];
          total += time;
        }
        const avg = total / timestamps.length;

        expect(eventBody).toEqual({
          batch: [
            {
              user: {
                ...optionalUserEventFields,
                platform: expectedPlatform,
                sdkType: "server",
                user_id: validUserId,
              },
              events: [
                {
                  type: "customEvent",
                  customType: eventType,
                  clientDate: expect.any(String),
                  date: expect.toBeOneOf([null, undefined, expect.any(String)]),
                  featureVars: {
                    "6386813a59f1b81cc9e6c68d": "6386813a59f1b81cc9e6c693",
                  },
                  metaData: expect.toBeNil(),
                  target: variableId,
                  value: value,
                  user_id: validUserId,
                },
                {
                  type: "customEvent",
                  clientDate: expect.any(String),
                  date: expect.toBeOneOf([null, undefined, expect.any(String)]),
                  featureVars: {
                    "6386813a59f1b81cc9e6c68d": "6386813a59f1b81cc9e6c693",
                  },
                  metaData: expect.toBeNil(),
                  customType: eventType2,
                  target: variableId2,
                  value: value2,
                  user_id: validUserId,
                },
              ],
            },
          ],
        });

        // checking if the failed reqests were made in 10% of the defined interva;
        expect(avg).toBeGreaterThanOrEqual(900);
        expect(avg).toBeLessThanOrEqual(1100);
      });
    });
  });
});
