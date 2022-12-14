
<h1 id="devcycle-test-harness-proxy">DevCycle Test Harness - Proxy v1.0.0</h1>

# Overview
The SDK proxy server is responsible for wrapping the SDK under test with an HTTP interface that can be used to call any of its public-facing methods with an arbitrary set of arguments,
and returning the response to the caller (which will be the harness server). It will also allow configuration options to be passed which override the base API URL the SDK makes requests to.
Setting that URL to the test harness server’s address allows the harness to mock the backend APIs to return data back (or to trigger errors).

### About `entityType`
To check that the SDK methods are returning a correct type of an instance, they will all contain an `entityType` in their response. `enityType` can be one of four values:
`Variable`, `User`, `Feature`, `Object`, `Void`

### How to use
Before calling any SDK methods, you must first create an instance of the SDK client. This is done by calling the `/client` endpoint with the `POST` method. The response will contain a `Location` header
which can be used to reference the client instance in subsequent calls.

The next step is to create a user instance. This is done by calling the `/user` endpoint with the `POST` method. The response will contain a `Location` header which can be used to reference the user instance in subsequent calls.

Once you have a client and user instance, you can invoke any SDK method by calling the `/{location}/command` endpoint with the `POST` method.

<h1 id="devcycle-test-harness-proxy-client">Client</h1>

SDK Client

<a id="opIdcreateClient"></a>

`POST /client`

*Create a DVC client instance*

> Body parameter

```json
{
  "clientId": "string",
  "sdkKey": "string",
  "options": {},
  "enableCloudBucketing": true
}
```

<h3 id="createclient-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|`clientId`|body|string|true|A unique ID that will be used to reference the client once it has been created|
|`sdkKey`|body|string|false|A unique key used to initialize the DVC SDK|
|`options`|body|object|false|An object of launch parameters. See [DevCycle Docs](https://docs.devcycle.com/docs/sdk/server-side-sdks/node#initialization-options) for a full list of options|
|`enableCloudBucketing`|body|boolean|false|An option to use the cloud bucketing version of the SDK|

> Example responses

> 200 Response

```json
{
  "exception": "Missing environment key! Call initialize with a valid environment key"
}
```

> 201 Response

```json
{
  "message": "Success"
}
```

> 400 Response

```json
{
  "message": "Invalid request: missing clientId"
}
```

<h3 id="createclient-responses">Responses</h3>

|Status|Meaning|Description|
|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Created|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Bad Request|

<h3 id="createclient-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Description|
|---|---|---|---|
|`» exception`|string|false|An error from the SDK indicating an exception was thrown during initialization|

Status Code **201**

|Name|Type|Required|Description|
|---|---|---|---|
|`» message`|string|true|A message indicating the result of initializing an SDK client|

Status Code **400**

|Name|Type|Required|Description|
|---|---|---|---|
|`» message`|string|true|An error message indicating what went wrong with the request|

### Response Headers

|Status|Header|Type|Format|Description|
|---|---|---|---|---|
|201|Location|string||Location of the Client instance on the proxy server|

<h1 id="devcycle-test-harness-proxy-user">User</h1>

SDK user

<a id="opIdcreateUser"></a>

`POST /user`

*Create a DVC user instance*

> Body parameter

```json
{
  "user_id": "string",
  "email": "string",
  "name": "string",
  "language": "string",
  "country": "string",
  "appVersion": "string",
  "appBuild": "string",
  "customData": {},
  "privateCustomData": {}
}
```

<h3 id="createuser-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|`body`|body|[User](#schemauser)|false|none|

> Example responses

> Created

```json
{
  "entityType": "User",
  "data": {
    "user_id": "test_id",
    "email": "testUser@gmail.com",
    "country": "CA"
  }
}
```

<h3 id="createuser-responses">Responses</h3>

|Status|Meaning|Description|
|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Created|

<h3 id="createuser-responseschema">Response Schema</h3>

Status Code **201**

|Name|Type|Required|Description|
|---|---|---|---|
|`» entityType`|string|false|A string literal `User`|
|`» data`|[User](#schemauser)|false|A User instance that's stored on the proxy|
|`»» user_id`|string|false|Identifies the current user on a client instance|
|`»» email`|string|false|Email used for identifying a user, or used for audience segmentation|
|`»» name`|string|false|Name of the user which can be used for identifying a user, or used for audience segmentation|
|`»» language`|string|false|ISO 639-1 two-letter codes, or ISO 639-2 three-letter codes|
|`»» country`|string|false|ISO 3166 two or three-letter codes|
|`»» appVersion`|string|false|Application Version, can be used for audience segmentation|
|`»» appBuild`|string|false|Application Build, can be used for audience segmentation|
|`»» customData`|object|false|Custom JSON data used for audience segmentation|
|`»» privateCustomData`|object|false|Private Custom JSON data used for audience segmentation|

### Response Headers

|Status|Header|Type|Format|Description|
|---|---|---|---|---|
|201|Location|string||Location of the User instance on the proxy server|

<h1 id="devcycle-test-harness-proxy-location">Location</h1>

A general endpoint to call a method on previously created object instances, such as SDK clients or DVC variables.

<a id="opIdcommand"></a>

`POST /{location}/command`

*Invoke a method on a previously created instance*

> Body parameter

```json
{
  "command": "variable",
  "isAsync": true,
  "params": [
    {
      "location": "user/3"
    },
    {
      "value": "string-key"
    },
    {
      "value": "string-key-default"
    }
  ]
}
```

<h3 id="command-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|`command`|body|string|false|The name of the SDK method to invoke|
|`isAsync`|body|boolean|false|Tells the proxy weather to wait on the SDK method or not|
|`params`|body|[anyOf]|false|Arguments to the SDK method. They should appear in the order they are passed to the SDK method|
|`» *anonymous*`|body|[LocationParam](#schemalocationparam)|false|An argument to an SDK method|
|`»» location`|body|string|false|Used to reference an instance that needs to be passed to the method. Need to use "location" of the instance i.e. `user/3`|
|`» *anonymous*`|body|[ValueParam](#schemavalueparam)|false|An argument to an SDK method|
|`»» value`|body|string|false|Used to pass a value to the method. For example, if you wish to call the `.variable` method of the SDK, the params array should contain `{ value: 'my-key' }`, `{ value: 'default-value'}`|
|`location`|path|string|true|Location of the instance that the method is being called on. For example, `client/464bb685-fd58-41b6-afa0-6df49e38c705` or `variable/3|

> Example responses

> The `.variable` local bucketing SDK method is called with an invalid user so the response should contain `exception`

```json
{
  "exception": "Must have a user_id set on the user"
}
```

> The `.variable` cloud bucketing SDK method is called with an invalid user so the response should contain `asyncError`

```json
{
  "asyncError": "Must have a user_id set on the user"
}
```

> Created

```json
{
  "entityType": "Variable",
  "data": {
    "_id": "638681f059f1b81cc9e6c7fa",
    "key": "bool-var",
    "type": "Boolean",
    "value": true
  },
  "logs": []
}
```

```json
{
  "entityType": "Object",
  "data": {
    "string-var": {
      "_id": "638681f059f1b81cc9e6c7fb",
      "key": "string-var",
      "type": "VariableType.string",
      "value": "string"
    },
    "number-var": {
      "_id": "638681f059f1b81cc9e6c7fc",
      "key": "number-var",
      "type": "VariableType.number",
      "value": 1
    }
  },
  "logs": []
}
```

> 404 Response

```json
{
  "message": "string"
}
```

<h3 id="command-responses">Responses</h3>

|Status|Meaning|Description|
|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Created|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not Found|

<h3 id="command-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Description|
|---|---|---|---|
|`» message`|string|false|A message indicating a certain action occurred when a method was invoked|
|`» exception`|string|false|A message of what exception was thrown during the method invocation|
|`» asyncError`|string|false|A messsage indicating that an error occurred during an asynchronous method invocation|

Status Code **201**

|Name|Type|Required|Description|
|---|---|---|---|
|`» entityType`|string|false|Type of entity returned. One of `Variable`, `User`, `Feature`, `Object` or `Void`|
|`» data`|object|false|Value returned by the method|
|`» logs`|[string]|false|Logs generated during the method invocation|
|`» exception`|string|false|An message of what exception was thrown during the method invocation|
|`» asyncError`|string|false|A messsage indicating that an error occurred during an asynchronous method invocation|

Status Code **404**

|Name|Type|Required|Description|
|---|---|---|---|
|`» message`|string|true|An error message indicating what went wrong with the request|

# Schemas

<h2 id="tocS_User">User</h2>

<a id="schemauser"></a>
<a id="schema_User"></a>
<a id="tocSuser"></a>
<a id="tocsuser"></a>

```json
{
  "user_id": "string",
  "email": "string",
  "name": "string",
  "language": "string",
  "country": "string",
  "appVersion": "string",
  "appBuild": "string",
  "customData": {},
  "privateCustomData": {}
}

```

A User instance that's stored on the proxy

### Properties

|Name|Type|Required|Description|
|---|---|---|---|
|`user_id`|string|false|Identifies the current user on a client instance|
|`email`|string|false|Email used for identifying a user, or used for audience segmentation|
|`name`|string|false|Name of the user which can be used for identifying a user, or used for audience segmentation|
|`language`|string|false|ISO 639-1 two-letter codes, or ISO 639-2 three-letter codes|
|`country`|string|false|ISO 3166 two or three-letter codes|
|`appVersion`|string|false|Application Version, can be used for audience segmentation|
|`appBuild`|string|false|Application Build, can be used for audience segmentation|
|`customData`|object|false|Custom JSON data used for audience segmentation|
|`privateCustomData`|object|false|Private Custom JSON data used for audience segmentation|

<h2 id="tocS_LocationParam">LocationParam</h2>

<a id="schemalocationparam"></a>
<a id="schema_LocationParam"></a>
<a id="tocSlocationparam"></a>
<a id="tocslocationparam"></a>

```json
{
  "location": "string"
}

```

An argument to an SDK method

### Properties

|Name|Type|Required|Description|
|---|---|---|---|
|`location`|string|false|Used to reference an instance that needs to be passed to the method. Need to use "location" of the instance i.e. `user/3`|

<h2 id="tocS_ValueParam">ValueParam</h2>

<a id="schemavalueparam"></a>
<a id="schema_ValueParam"></a>
<a id="tocSvalueparam"></a>
<a id="tocsvalueparam"></a>

```json
{
  "value": "string"
}

```

An argument to an SDK method

### Properties

|Name|Type|Required|Description|
|---|---|---|---|
|`value`|string|false|Used to pass a value to the method. For example, if you wish to call the `.variable` method of the SDK, the params array should contain `{ value: 'my-key' }`, `{ value: 'default-value'}`|

