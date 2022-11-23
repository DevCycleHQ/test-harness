import Koa from "koa";
import axios from "axios";
import { DVCClient, DVCUser } from "@devcycle/nodejs-server-sdk";

type LocationRequestBody = {
  command: string;
  params: string; //[{value: string | number | boolean} | {location: string} | {callbackUrl: string}] HTTP request comes in as string
  isAsync: boolean;
};

export const handleLocation = async (
  ctx: Koa.ParameterizedContext,
  data: {
    clients: { [key: string]: DVCClient };
    users: { [key: string]: DVCUser };
  }
) => {
  const body = ctx.request.body as LocationRequestBody;
  const urlParts = ctx.request.url.split("/");
  console.log(urlParts);
  let entity = getEntityFromLocation(ctx.request.url, data);

  if (entity === undefined) {
    ctx.status = 400;
    ctx.body = {
      errorCode: 400,
      errorMessage: "Invalid request: missing entity",
    };
  } else if (body.command === undefined) {
    ctx.status = 400;
    ctx.body = {
      errorCode: 400,
      errorMessage: "Invalid request: missing command",
    };
  } else {
    try {
      const command = body.command;
      const params: any | string | boolean | number = parseParams(
        JSON.parse(body.params),
        data
      );

      if (params[params.length - 1] instanceof URL) {
        const callbackURL: URL = params[params.length - 1];
        const onUpdateCallback = (data) => {
          axios
            .post(callbackURL.href, { data: data }) //send back the updated data
            .then((resp) => console.log("onUpdatecallback resp ", resp))
            .catch((e) => console.error(e));
        };
        invokeCommand(entity, command, params, body.isAsync).then((data) => {
          console.log("data", data);
          onUpdateCallback(data);
        });
        ctx.status = 200;
        ctx.body = {
          entityType: "pending", // TODO: add pending entity type
          data: "pending",
          logs: [], // TODO add logs here
        };
      } else {
        // TODO: handle callback before invoking command
        const resultData = await invokeCommand(
          entity,
          command,
          params,
          body.isAsync
        );

        ctx.status = 200;
        ctx.body = {
          entityType: resultData.constructor.name, // assuming this is the type of the entity for returned data
          data: resultData,
          logs: [], // TODO add logs here
        };
      }
    } catch (error) {
      if (body.isAsync) {
        ctx.status = 200;
        ctx.body = {
          asyncError: error.message,
          errorCode: error.code,
        };
      } else {
        ctx.status = 200;
        ctx.body = {
          errorCode: error.code,
          exception: error.message,
        };
      }
    }
  }
};

const getEntityFromLocation = (location, data) => {
  const urlParts = location.split("/");
  const entityType = urlParts[urlParts.length - 2];
  const id = urlParts[urlParts.length - 1];
  let entity;
  if (entityType === "user") {
    entity = data.users[id];
  }
  if (entityType === "client") {
    entity = data.clients[id];
  }
  return entity;
};

const parseParams = (params, data): (string | boolean | number | any)[] => {
  const parsedParams: (string | boolean | number | any)[] = [];
  params.forEach((element) => {
    if (element.value !== undefined) {
      parsedParams.push(element.value);
    } else if (element.location !== undefined) {
      parsedParams.push(getEntityFromLocation(element.location, data));
    } else if (element.callbackURL !== undefined) {
      parsedParams.push(new URL(element.callbackURL));
    }
  });
  console.log("parsedParams", parsedParams);
  return parsedParams;
};

const invokeCommand = async (entity, command, params, isAsync) => {
  if (isAsync) {
    const result = await entity[command](...params);
    return result;
  }
  {
    return entity[command](...params);
  }
};
