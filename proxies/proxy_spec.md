
# Test Harness Proxy Servers

##General Guidelines

#### Entity Types
- In addition to returning a JSON of the object properties whenever an object is created, the proxy server needs to include the class of the object in the response. It should translate all SDK-specific class names to a recognized entityType when reporting the type returned by a command. 
    - **entityType**: one of 'Variable', 'User', 'Feature', or 'Object'`

#### Locations
- Whenever a request results in an object being created, it should be stored in such a way that it can be referenced later with a location string
- The location of the object should be indexed by the command that created the object, rather than an assumption about the type of the object. So an object returned by the `variable` command should be referenced by `variable/:id`

#### Errors
- All endpoints should be wrapped in a try/catch. If an exception is thrown, the response body should be a JSON object containing:
    - **exception**: the exception message
- If an async function fails or is rejected, the response body should be a JSON object containing:
    - **asyncError**: the error message

#### Logs
- The proxy server should override the logger for the SDK and include an array of logs in the response body
    - **logs**: an array of log strings


## Server Endpoints

### GET /spec
The proxy should return a 200 status to indicate that the service has started. It should also return a JSON object in the response body, with the following properties:
- **name**: name of the SDK being tested,
- **version**: The version string of the SDK,
- **capabilities**: An array of strings describing optional features that this SDK supports 
The current capability options are `"edgeDb", "sse", "localBucketing"  `
When a new capability is added to an SDK, this needs to be updated to tell the test harness to run the associated tests. 




### POST /client
Initialize and store a client instance.

The request body should contain the following properties
- **sdkKey**: string,
- **options**: JSON of configuration options to pass to the client

The server should construct a client with the appropriate configuration. It should respond with 200 and a `location` header referencing the client location in the format `client/:clientId`.



### POST /user
Initialize and store a user instance.

The request body should contain a JSON with all the user properties. For example:
```json
{
    user_id: string,
    name: string,
    isAnonymous: boolean,
    ...
}
```

The server should respond with the same [Response Format](####Response) as below.

### POST /:location 
Call a function on a specific object, referenced by location (for example, `client/:clientId` or `variable/:variableId`).

#### Request
```json
{
    command: string,
    isAsync: (optional) boolean,
    params: [
        { //param can contain either location or value:
            location: string, // the location of an object to reference
        },
        {
            value: string, number, or boolean
        },
        {
            callbackURL: string
        }
    ],
}
```
**Properties**:
- **command**: the name of the function to call
- **isAsync**: (optional) a flag to tell the proxy server to wait for the command to finish before responding, however is appropriate for the language
- **params**: an ordered array of parameters to pass to the function
    - each param should should be a JSON object containing one of:
        - **location**: the location of an object to reference. The proxy server should replace this parameter with the object at that location
        - **value**: the plain value to pass to the function
        - **callback**: if the command sets a callback (for example, onUpdate), this specifies the URL to post the data to when the callback is called. The proxy server should create a callback function that sends a POST to this URL when the callback is called, and replace the param with that function. 

####Response

If the command returns an object, the server should respond with 200 and a location header with the location of the object. The body of the response should be a JSON containing:

```json
{
    entityType: string, // (must be one of the entityTypes above)
    data:  {} | [], // JSON representation of the result of the function. Either a JSON containing the properties of the object, or an array of JSONs 
    logs: string[] // array of any logs produced during the command,
}
```
If the command was async and was rejected, the response should be a JSON containing:
```json
{
    asyncError: string
}
```
If any other exception occurred, the response should be a JSON containing:
```json
{
    exception: string
}
```