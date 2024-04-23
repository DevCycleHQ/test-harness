import {
  DevCycleClient,
  DevCycleCloudClient,
} from "@devcycle/nodejs-server-sdk";
import { Client as OFClient } from "@openfeature/server-sdk";

export enum EntityTypes {
  user = "User",
  variable = "Variable",
  feature = "Feature",
  object = "Object",
  client = "Client",
  void = "Void",
}

export type DataStoreClient = {
  dvcClient: DevCycleClient | DevCycleCloudClient;
  openFeatureClient: OFClient;
};

export type DataStore = {
  clients: { [key: string]: DataStoreClient };
  commandResults: { [key: string]: any };
};

export const getEntityFromType = (value: string): string => {
  switch (value) {
    case "DVCUser":
      return EntityTypes.user;
    case "DVCVariable":
      return EntityTypes.variable;
    case "DVCFeature":
      return EntityTypes.feature;
    case "DevCycleClient":
      return EntityTypes.client;
    default:
      return EntityTypes.object;
  }
};
