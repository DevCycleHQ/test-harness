import { BucketedUserConfig, VariableType } from "@devcycle/types";

export const variables: BucketedUserConfig["variables"] = {
  "bool-var": {
    _id: "638681f059f1b81cc9e6c7fa",
    key: "bool-var",
    type: VariableType.boolean,
    value: true,
  },
  "string-var": {
    _id: "638681f059f1b81cc9e6c7fb",
    key: "string-var",
    type: VariableType.string,
    value: "string",
  },
  "number-var": {
    _id: "638681f059f1b81cc9e6c7fc",
    key: "number-var",
    type: VariableType.number,
    value: 1,
  },
  "json-var": {
    _id: "638681f059f1b81cc9e6c7fd",
    key: "json-var",
    type: VariableType.json,
    value: {
      facts: true,
    },
  },
  "schedule-feature": {
    _id: "6386813a59f1b81cc9e6c68f",
    key: "schedule-feature",
    type: VariableType.boolean,
    value: true,
  },
  "unicode-var": {
    _id: "638681f059f1b81cc9e6c7fe",
    key: "unicode-var",
    type: VariableType.string,
    value: "↑↑↓↓←→←→BA 🤖",
  },
};
