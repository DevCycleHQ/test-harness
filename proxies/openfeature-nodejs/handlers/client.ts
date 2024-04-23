import Koa from "koa";
import { initializeDevCycle } from "@devcycle/nodejs-server-sdk";
import { dataStore } from "../app";
import { OpenFeature } from "@openfeature/server-sdk";

type ClientRequestBody = {
  clientId: string;
  sdkKey: string;
  enableCloudBucketing?: boolean;
  waitForInitialization?: boolean;
  options: { [key: string]: string };
};

export const handleClient = async (ctx: Koa.ParameterizedContext) => {
  const { clientId, sdkKey, enableCloudBucketing, options } = <
    ClientRequestBody
  >ctx.request.body;

  if (clientId === undefined) {
    ctx.status = 400;
    ctx.body = {
      message: "Invalid request: missing clientId",
    };
    return ctx;
  }

  try {
    let asyncError;
    const dvcClient = initializeDevCycle(sdkKey, {
      ...options,
      enableCloudBucketing,
    });

    try {
      await OpenFeature.setProviderAndWait(
        await dvcClient.getOpenFeatureProvider(),
      );
    } catch (e) {
      asyncError = e;
    }
    const openFeatureClient = OpenFeature.getClient();

    dataStore.clients[clientId] = { dvcClient, openFeatureClient };
    ctx.status = 201;
    ctx.set("Location", `client/${clientId}`);

    if (asyncError) {
      ctx.body = { asyncError: asyncError.message };
    } else {
      ctx.body = { message: "success" };
    }
  } catch (error) {
    ctx.status = 200;
    ctx.body = { exception: error.message };
  }
};
