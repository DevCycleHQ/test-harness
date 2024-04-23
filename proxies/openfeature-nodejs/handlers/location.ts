import {
  DevCycleEvent,
  DevCycleUser,
  DVCVariable as DVCVariableInterface,
  DVCJSON,
} from "@devcycle/nodejs-server-sdk";
import {
  Client as OFClient,
  EvaluationDetails,
  StandardResolutionReasons,
  FlagValue,
  JsonValue,
} from "@openfeature/server-sdk";
import Koa from "koa";
import {
  getEntityFromType,
  DataStore,
  EntityTypes,
  DataStoreClient,
} from "../entityTypes";
import { dataStore } from "../app";

type RequestWithEntity = Koa.Request & {
  entity: DataStoreClient | DevCycleUser | DVCVariableInterface<any>;
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
    if (result instanceof Promise) {
      result = await result;
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

const getOpenFeatureVariable = async (
  openFeatureClient: OFClient,
  params: any[],
): Promise<DVCVariable> => {
  const [user, key, defaultValue, type] = params;
  if (type === "boolean") {
    return dvcVariableFromEvaluationDetails(
      await openFeatureClient.getBooleanDetails(
        key,
        defaultValue as boolean,
        user,
      ),
      defaultValue,
    );
  } else if (type === "number") {
    return dvcVariableFromEvaluationDetails(
      await openFeatureClient.getNumberDetails(
        key,
        defaultValue as number,
        user,
      ),
      defaultValue,
    );
  } else if (type === "JSON") {
    return dvcVariableFromEvaluationDetails(
      await openFeatureClient.getObjectDetails(
        key,
        defaultValue as JsonValue,
        user,
      ),
      defaultValue,
    );
  } else if (type === "string") {
    return dvcVariableFromEvaluationDetails(
      await openFeatureClient.getStringDetails(
        key,
        defaultValue as string,
        user,
      ),
      defaultValue,
    );
  } else {
    throw new Error("Invalid default value type");
  }
};

const getOpenFeatureVariableValue = async (
  openFeatureClient: OFClient,
  params: any[],
): Promise<DVCVariableInterface<any>["value"]> => {
  const [user, key, defaultValue, type] = params;
  if (type === "boolean") {
    return await openFeatureClient.getBooleanValue(
      key,
      defaultValue as boolean,
      user,
    );
  } else if (type === "number") {
    return await openFeatureClient.getNumberValue(
      key,
      defaultValue as number,
      user,
    );
  } else if (type === "JSON") {
    return (await openFeatureClient.getObjectValue(
      key,
      defaultValue as JsonValue,
      user,
    )) as DVCJSON;
  } else if (type === "string") {
    return await openFeatureClient.getStringValue(
      key,
      defaultValue as string,
      user,
    );
  } else {
    throw new Error("Invalid default value type");
  }
};

/**
 * Fake DVCVariable Class so that the variable type reporting works correctly
 */
class DVCVariable implements DVCVariableInterface<any> {
  constructor(
    public key: string,
    public value: DVCVariableInterface<any>["value"],
    public defaultValue: DVCVariableInterface<any>["value"],
    public isDefaulted: DVCVariableInterface<any>["isDefaulted"],
    public type: DVCVariableInterface<any>["type"],
  ) {}
}

/**
 * Convert OpenFeature EvaluationDetails to DVCVariable
 */
const dvcVariableFromEvaluationDetails = <T extends FlagValue>(
  evalDetails: EvaluationDetails<T>,
  defaultValue: T,
): DVCVariable => {
  let varType: string = typeof evalDetails.value;
  if (varType === "object") {
    varType = "JSON";
  }

  if (evalDetails.errorCode) {
    console.log(
      `error code: ${evalDetails.errorCode}, throw error: ${evalDetails.errorMessage}`,
    );
    if (evalDetails.errorMessage.includes("Missing parameter:")) {
      throw new Error(evalDetails.errorMessage);
    }
  }

  const dvcVar = new DVCVariable(
    evalDetails.flagKey,
    evalDetails.value as DVCVariable["value"],
    defaultValue as DVCVariable["value"],
    evalDetails.reason !== StandardResolutionReasons.TARGETING_MATCH,
    // Capitalize first letter of type
    (varType.charAt(0).toUpperCase() + varType.slice(1)) as DVCVariable["type"],
  );
  console.log(`dvcVar: ${JSON.stringify(dvcVar)}`);
  return dvcVar;
};

const invokeCommand = (
  entity: DataStoreClient | DevCycleUser | DVCVariable | any,
  command: string,
  params: ParsedParams,
) => {
  console.log(
    `invoking command "${command}" on "${typeof entity}" with params ${JSON.stringify(params)}`,
  );
  const dataStoreClient = entity as DataStoreClient;
  if (command === "variable") {
    return getOpenFeatureVariable(dataStoreClient.openFeatureClient, params);
  } else if (command === "variableValue") {
    return getOpenFeatureVariableValue(
      dataStoreClient.openFeatureClient,
      params,
    );
  }

  return dataStoreClient.dvcClient[command](...params);
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
