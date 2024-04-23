import {
  DevCycleClient,
  DevCycleEvent,
  DevCycleUser,
  DVCVariable,
} from "@devcycle/nodejs-server-sdk";
import Koa from "koa";
import { getEntityFromType, DataStore, EntityTypes } from "../entityTypes";
import { dataStore } from "../app";

type RequestWithEntity = Koa.Request & {
  entity: DevCycleClient | DevCycleUser | DVCVariable<any>;
};

type Param = {
  location?: string;
  callbackURL?: string;
  value?: unknown;
  type?: "user" | "event";
};

//HTTP request comes in as string
type LocationRequestBody = {
  command: string;
  params: Param[];
  user?: DevCycleUser;
  event?: DevCycleEvent;
  isAsync: boolean;
};

type ParsedParams = any[];

export const handleLocation = async (ctx: Koa.ParameterizedContext) => {
  const body = ctx.request.body as LocationRequestBody;
  const { command, params, isAsync } = body;
  const entity = (ctx.request as RequestWithEntity).entity;
  try {
    const parsedParams: ParsedParams = parseParams(body, params, dataStore);
    if (parsedParams.includes(undefined)) {
      ctx.status = 404;
      ctx.body = {
        message: "Invalid request: missing entity from param",
      };
      return ctx;
    }

    let result;
    if (isAsync) {
      result = await invokeCommand(entity, command, parsedParams);
    } else {
      result = invokeCommand(entity, command, parsedParams);
    }

    const entityType = result
      ? getEntityFromType(result.constructor.name)
      : EntityTypes.void;

    const commandId =
      dataStore.commandResults[command] !== undefined
        ? Object.keys(dataStore.commandResults[command]).length
        : 0;

    if (dataStore.commandResults[command] === undefined) {
      dataStore.commandResults[command] = {};
    }
    dataStore.commandResults[command][commandId] = result;

    ctx.status = 201;
    ctx.set("Location", `command/${command}/${commandId}`);
    ctx.body = {
      entityType: entityType,
      data: entityType === EntityTypes.client ? {} : result,
      logs: [], // TODO add logs
    };
  } catch (error) {
    console.error(error);
    if (isAsync) {
      ctx.status = 200;
      ctx.body = {
        asyncError: error.message,
        stack: error.stack,
      };
    } else {
      ctx.status = 200;
      ctx.body = {
        exception: error.message,
        stack: error.stack,
      };
    }
  }
};

const getEntityFromLocation = (location: string, data: DataStore) => {
  const urlParts = location.replace(/^\//, "").split("/");
  const [locationType, ...locationPath] = urlParts;

  if (locationType === "command") {
    const [entityType, commandId] = locationPath;
    return data.commandResults[entityType][commandId];
  } else if (locationType === "client") {
    const [clientId] = locationPath;
    return data.clients[clientId];
  }

  return undefined;
};

const getEntityFromParamType = (
  type: "user" | "event",
  body: LocationRequestBody,
) => {
  if (type === "user") {
    return body.user;
  } else if (type === "event") {
    return body.event;
  }
  return undefined;
};

const parseParams = (
  body: LocationRequestBody,
  params: Param[],
  data: DataStore,
): ParsedParams => {
  const parsedParams: ParsedParams = [];
  params.forEach((element) => {
    if (element.callbackURL) {
      parsedParams.push(new URL(element.callbackURL));
    } else if (element.type) {
      parsedParams.push(getEntityFromParamType(element.type, body));
    } else {
      parsedParams.push(element.value);
    }
  });
  return parsedParams;
};

const invokeCommand = (
  entity: DevCycleClient | DevCycleUser | DVCVariable<any> | any,
  command: string,
  params: ParsedParams,
) => {
  return entity[command](...params);
};

export const validateLocationReqMiddleware = async (
  ctx: Koa.ParameterizedContext,
  next,
) => {
  const entity = getEntityFromLocation(ctx.request.url, dataStore);
  const body = ctx.request.body as LocationRequestBody;

  if (entity === undefined) {
    ctx.status = 404;
    ctx.body = {
      message: "Invalid request: missing entity",
    };
    return ctx;
  }
  if (body.command === undefined) {
    ctx.status = 404;
    ctx.body = {
      message: "Invalid request: missing command",
    };
    return ctx;
  }
  (ctx.request as RequestWithEntity).entity = entity;
  await next();
};
