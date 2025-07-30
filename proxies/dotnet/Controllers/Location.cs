using System.ComponentModel.DataAnnotations;
using DevCycle.SDK.Server.Cloud.Api;
using DevCycle.SDK.Server.Local.Api;
using DevCycle.SDK.Server.Common.Model;
using Microsoft.AspNetCore.Mvc;
using System.Reflection;
using System.ComponentModel;
using Newtonsoft.Json.Linq;
using OpenFeature;
using OpenFeature.Model;
using System.Dynamic;
using System.Text.Json;
using DevCycle.SDK.Server.Common;

namespace dotnet.Controllers;

public class PostBody
{
    [Required] public string Command { get; set; } = "";

    [Required] public bool IsAsync { get; set; } = false;

    [Required] public List<JToken> Params { get; set; } = new List<JToken> { };

    public ClientRequestUser? User { get; set; }

    public ClientRequestEvent? Event { get; set; }
}

public class CommandResult
{
    [Required] public string EntityType { get; set; } = "";

    [Required] public object Data { get; set; } = new Object { };

    public List<string>? Logs { get; set; } = new List<string> { };

    public string? CommandId { get; set; }
}

[ApiController]
[Route("{**catchall}")]
public class LocationController : ControllerBase
{
    private readonly ILogger<LocationController> _logger;

    public LocationController(ILogger<LocationController> logger)
    {
        _logger = logger;
    }

    private static string[] EntityTypes = new[] { "User", "Variable", "Feature", "Object", "Client" };

    [HttpPost]
    [Route("/{**location}")]
    public async Task<object> Post([FromBody] PostBody body, string location)
    {
        if (location.Length == 0)
        {
            Response.StatusCode = 400;
            return new { message = "Invalid request: missing location" };
        }

        object entity;
        List<object> parsedParams;

        try
        {
            entity = GetEntity(location);
        }
        catch (Exception e)
        {
            Response.StatusCode = 404;
            return new { message = e.Message };
        }

        try
        {
            parsedParams = ParseParams(body.Params, body.User, body.Event);
            var result = await InvokeCommand(entity, body.Command, body.IsAsync, parsedParams);

            if (body.Command == "close")
            {
                // TODO move this to its own dedicated endpoint
                var id = location.Split('/')[1];
                DataStore.LocalClients.Remove(id);
            }

            Response.StatusCode = 201;
            Response.Headers.Add("Location", $"command/{body.Command}/{result.CommandId}");

            return new
            {
                entityType = result.EntityType,
                data = result.Data,
                logs = result.Logs
            };
        }
        catch (Exception e)
        {
            Console.WriteLine("[COMMAND ERROR] " + body.Command + ": " + e);

            Response.StatusCode = 200;

            if (body.IsAsync)
            {
                return new
                {
                    asyncError = e.Message,
                    stack = e.StackTrace,
                };
            }
            else
            {
                return new
                {
                    exception = e.Message,
                    stack = e.StackTrace,
                };
            }
        }
    }

    private List<object> ParseParams(List<JToken> bodyParams, ClientRequestUser user, ClientRequestEvent reqEvent)
    {
        var result = new List<object> { };

        foreach (var param in bodyParams)
        {
            if (param["type"]?.Value<string>() == "user")
            {
                var sdkUser = new DevCycleUser(
                    user.UserId,
                    user.Email,
                    user.Name,
                    user.Language,
                    user.Country,
                    user.AppVersion,
                    user.AppBuild,
                    user.CustomData,
                    user.PrivateCustomData,
                    user.CreatedDate,
                    user.LastSeenDate,
                    user.Platform,
                    user.PlatformVersion,
                    user.DeviceModel,
                    user.SdkType,
                    user.SdkVersion
                );
                result.Add(sdkUser);
            }
            else if (param["type"]?.Value<string>() == "event")
            {
                var sdkEvent = new DevCycleEvent(
                    reqEvent.Type,
                    reqEvent.Target,
                    reqEvent.Date,
                    reqEvent.Value,
                    reqEvent.MetaData
                );
                result.Add(sdkEvent);
            }
            else if (param["value"] != null)
            {
                var type = param["value"].Type;
                if (type == JTokenType.Null)
                {
                    result.Add(null);
                }
                else if (type == JTokenType.Float)
                {
                    result.Add(param["value"].Value<decimal>());
                }
                else if (type == JTokenType.Integer)
                {
                    result.Add(param["value"].Value<long>());
                }
                else if (type == JTokenType.String)
                {
                    result.Add(param["value"].Value<string>() ?? "");
                }
                else if (type == JTokenType.Object)
                {
                    var jObject = param["value"] as JObject;
                    var dict = jObject?.ToObject<Dictionary<string, object>>();
                    result.Add(dict);
                }
                else
                {
                    result.Add(param["value"].Value<bool>());
                }
            }
        }

        return result;
    }

    private object GetEntity(string location)
    {
        var parts = location.Split('/');
        var type = parts[0];
        var id = parts[1];

        object? result = null;
        if (type == "client")
        {
            if (DataStore.OpenFeatureClients.TryGetValue(id, out DataStoreClient? ofClient))
            {
                result = ofClient;
            }
            else if (DataStore.CloudClients.TryGetValue(id, out DevCycleCloudClient? cloudClient))
            {
                result = cloudClient;
            }
            else if (DataStore.LocalClients.TryGetValue(id, out DevCycleLocalClient? localClient))
            {
                result = localClient;
            }
        }
        else if (type == "command" && DataStore.Commands.TryGetValue(id, out object? command))
        {
            result = command;
        }

        if (result == null)
        {
            throw new Exception($"Entity {location} not found");
        }

        return result;
    }

    private async Task<object> GetOpenFeatureVariable(IFeatureClient openFeatureClient, List<object> parsedParams)
    {
        var user = parsedParams[0] as DevCycleUser;
        var key = parsedParams[1] as string;
        var defaultValue = parsedParams[2];
        var type = parsedParams[3] as string;

        var context = ConvertUserToEvaluationContext(user);

        if (type == "boolean")
        {
            var details = await openFeatureClient.GetBooleanDetailsAsync(key, (bool)defaultValue, context);
            return CreateDvcVariableFromDetails(details, defaultValue);
        }
        else if (type == "number")
        {
            if (defaultValue is int)
            {
                var details = await openFeatureClient.GetIntegerDetailsAsync(key, (int)defaultValue, context);
                return CreateDvcVariableFromDetails(details, defaultValue);
            }
            else
            {
                var details = await openFeatureClient.GetDoubleDetailsAsync(key, (double)defaultValue, context);
                return CreateDvcVariableFromDetails(details, defaultValue);
            }
        }
        else if (type == "string")
        {
            var details = await openFeatureClient.GetStringDetailsAsync(key, (string)defaultValue, context);
            return CreateDvcVariableFromDetails(details, defaultValue);
        }
        else if (type == "JSON")
        {
            // Convert Dictionary to OpenFeature Structure
            var structure = ConvertToStructure(defaultValue);
            var details = await openFeatureClient.GetObjectDetailsAsync(key, new Value(structure), context);
            return CreateDvcVariableFromDetails(details, defaultValue);
        }
        else
        {
            throw new Exception("Invalid default value type");
        }
    }

    private async Task<object> GetOpenFeatureVariableValue(IFeatureClient openFeatureClient, List<object> parsedParams)
    {
        var user = parsedParams[0] as DevCycleUser;
        var key = parsedParams[1] as string;
        var defaultValue = parsedParams[2];
        var type = parsedParams[3] as string;

        var context = ConvertUserToEvaluationContext(user);

        if (type == "boolean")
        {
            return await openFeatureClient.GetBooleanValueAsync(key, (bool)defaultValue, context);
        }
        else if (type == "number")
        {
            if (defaultValue is int)
            {
                return await openFeatureClient.GetIntegerValueAsync(key, (int)defaultValue, context);
            }
            else
            {
                return await openFeatureClient.GetDoubleValueAsync(key, (double)defaultValue, context);
            }
        }
        else if (type == "string")
        {
            return await openFeatureClient.GetStringValueAsync(key, (string)defaultValue, context);
        }
        else if (type == "JSON")
        {
            // Convert Dictionary to OpenFeature Structure
            var structure = ConvertToStructure(defaultValue);
            var result = await openFeatureClient.GetObjectValueAsync(key, new Value(structure), context);
            return result.AsObject;
        }
        else
        {
            throw new Exception("Invalid default value type");
        }
    }

    private object EnsureVariableSerializable(object variable)
    {
        if (variable == null) return null;

        // Use reflection to get variable properties and create a serializable copy
        var variableType = variable.GetType();
        var keyProp = variableType.GetProperty("Key");
        var valueProp = variableType.GetProperty("Value");
        var defaultValueProp = variableType.GetProperty("DefaultValue");
        var isDefaultedProp = variableType.GetProperty("IsDefaulted");
        var typeProp = variableType.GetProperty("Type");

        if (keyProp == null || valueProp == null || defaultValueProp == null ||
            isDefaultedProp == null || typeProp == null)
        {
            return variable; // Return as-is if we can't get the properties
        }

        var key = keyProp.GetValue(variable)?.ToString() ?? "";
        var value = valueProp.GetValue(variable);
        var defaultValue = defaultValueProp.GetValue(variable);
        var isDefaulted = (bool)(isDefaultedProp.GetValue(variable) ?? false);
        var type = typeProp.GetValue(variable)?.ToString() ?? "";

        // Create a new serializable object with the same properties
        return new
        {
            key = key,
            value = EnsureSerializable(value),
            defaultValue = EnsureSerializable(defaultValue),
            isDefaulted = isDefaulted,
            type = type
        };
    }

    private Structure ConvertToStructure(object obj)
    {
        var structureBuilder = Structure.Builder();

        if (obj is Dictionary<string, object> dict)
        {
            foreach (var kvp in dict)
            {
                structureBuilder.Set(kvp.Key, ConvertToValue(kvp.Value));
            }
        }

        return structureBuilder.Build();
    }

    private Value ConvertToValue(object obj)
    {
        if (obj == null) return new Value((string)null);
        if (obj is string str) return new Value(str);
        if (obj is bool boolean) return new Value(boolean);
        if (obj is int integer) return new Value(integer);
        if (obj is double dbl) return new Value(dbl);
        if (obj is Dictionary<string, object> dict) return new Value(ConvertToStructure(dict));

        // For other types, convert to string
        return new Value(obj.ToString());
    }

    private object ConvertJsonElementToObject(JsonElement element)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                var dict = new Dictionary<string, object>();
                foreach (var property in element.EnumerateObject())
                {
                    dict[property.Name] = ConvertJsonElementToObject(property.Value);
                }
                return dict;
            case JsonValueKind.Array:
                var list = new List<object>();
                foreach (var item in element.EnumerateArray())
                {
                    list.Add(ConvertJsonElementToObject(item));
                }
                return list.ToArray();
            case JsonValueKind.String:
                return element.GetString() ?? "";
            case JsonValueKind.Number:
                if (element.TryGetInt32(out int intValue))
                    return intValue;
                if (element.TryGetDouble(out double doubleValue))
                    return doubleValue;
                return element.GetDecimal();
            case JsonValueKind.True:
                return true;
            case JsonValueKind.False:
                return false;
            case JsonValueKind.Null:
                return null;
            default:
                return element.ToString();
        }
    }

    private object EnsureSerializable(object obj)
    {
        if (obj == null) return null;

        // Convert Dictionary to a new Dictionary for better serialization
        if (obj is Dictionary<string, object> dict)
        {
            var newDict = new Dictionary<string, object>();
            foreach (var kvp in dict)
            {
                newDict[kvp.Key] = EnsureSerializable(kvp.Value); // Recursively ensure nested objects are serializable
            }
            return newDict;
        }

        return obj;
    }

    private EvaluationContext ConvertUserToEvaluationContext(DevCycleUser? user)
    {
        if (user == null)
        {
            return EvaluationContext.Empty;
        }

        var contextBuilder = EvaluationContext.Builder()
            .Set("targetingKey", user.UserId ?? "");

        if (!string.IsNullOrEmpty(user.Email))
            contextBuilder.Set("email", user.Email);
        if (!string.IsNullOrEmpty(user.Name))
            contextBuilder.Set("name", user.Name);
        if (!string.IsNullOrEmpty(user.Language))
            contextBuilder.Set("language", user.Language);
        if (!string.IsNullOrEmpty(user.Country))
            contextBuilder.Set("country", user.Country);
        if (!string.IsNullOrEmpty(user.AppVersion))
            contextBuilder.Set("appVersion", user.AppVersion);
        if (user.AppBuild != 0)
            contextBuilder.Set("appBuild", user.AppBuild.ToString());
        if (!string.IsNullOrEmpty(user.Platform))
            contextBuilder.Set("platform", user.Platform);
        if (!string.IsNullOrEmpty(user.PlatformVersion))
            contextBuilder.Set("platformVersion", user.PlatformVersion);
        if (!string.IsNullOrEmpty(user.DeviceModel))
            contextBuilder.Set("deviceModel", user.DeviceModel);

        // Add custom data
        if (user.CustomData != null)
        {
            foreach (var kvp in user.CustomData)
            {
                contextBuilder.Set(kvp.Key, new Value(kvp.Value));
            }
        }

        return contextBuilder.Build();
    }

    private DVCVariable CreateDvcVariableFromDetails<T>(FlagEvaluationDetails<T> details, object defaultValue)
    {
        var varType = typeof(T).Name.ToLower();
        if (varType == "object" || varType == "value")
        {
            varType = "JSON";
        }
        else if (varType == "int32" || varType == "double")
        {
            varType = "number";
        }

        // Handle error codes like in Node.js implementation
        if (details.ErrorType != OpenFeature.Constant.ErrorType.None)
        {
            Console.WriteLine($"error type: {details.ErrorType}, error message: {details.ErrorMessage}");
            if (details.ErrorMessage?.Contains("Missing parameter:") == true)
            {
                throw new Exception(details.ErrorMessage);
            }
        }

        var isDefaulted = details.Reason == OpenFeature.Constant.Reason.Default;

        // Convert Value objects to proper serializable types for JSON
        object serializedValue = details.Value;
        object serializedDefaultValue = defaultValue;

        if (varType == "JSON")
        {
            if (details.Value is Value valueObj)
            {
                serializedValue = valueObj.AsObject;
            }

            // Ensure both value and defaultValue are serializable for JSON types
            serializedValue = EnsureSerializable(serializedValue);
            serializedDefaultValue = EnsureSerializable(serializedDefaultValue);
        }

        // Log and extract metadata values for serialization
        Dictionary<string, object>? serializableMetadata = null;
        if (details.FlagMetadata != null)
        {
            Console.WriteLine($"  evalReasonDetails: {details.FlagMetadata.GetString("evalReasonDetails")}");
            Console.WriteLine($"  evalReasonTargetId: {details.FlagMetadata.GetString("evalReasonTargetId")}");

            serializableMetadata = new Dictionary<string, object>();
            var evalReasonDetails = details.FlagMetadata.GetString("evalReasonDetails");
            var evalReasonTargetId = details.FlagMetadata.GetString("evalReasonTargetId");

            if (!string.IsNullOrEmpty(evalReasonDetails))
                serializableMetadata["evalReasonDetails"] = evalReasonDetails;
            if (!string.IsNullOrEmpty(evalReasonTargetId))
                serializableMetadata["evalReasonTargetId"] = evalReasonTargetId;
        }

        return new DVCVariable(
            details.FlagKey,
            serializedValue,
            serializedDefaultValue,
            isDefaulted,
            char.ToUpper(varType[0]) + varType.Substring(1),
            details.Reason?.ToString(),
            serializableMetadata
        );
    }

    /// <summary>
    /// Fake DVCVariable Class so that the variable type reporting works correctly
    /// </summary>
    public class DVCVariable
    {
        public string Key { get; set; }
        public object Value { get; set; }
        public object DefaultValue { get; set; }
        public bool IsDefaulted { get; set; }
        public string Type { get; set; }
        public string? Reason { get; set; }
        public Dictionary<string, object>? FlagMetadata { get; set; }

        public DVCVariable(string key, object value, object defaultValue, bool isDefaulted, string type, string? reason = null, Dictionary<string, object>? flagMetadata = null)
        {
            Key = key;
            Value = value;
            DefaultValue = defaultValue;
            IsDefaulted = isDefaulted;
            Type = type;
            Reason = reason;
            FlagMetadata = flagMetadata;
        }
    }

    private async Task<CommandResult> InvokeCommand(object entity, string command, bool isAsync,
        List<object> parsedParams)
    {
        object result = null;

        // Handle OpenFeature clients
        if (entity is DataStoreClient dataStoreClient && dataStoreClient.IsOpenFeature)
        {
            if (command == "variable")
            {
                result = await GetOpenFeatureVariable(dataStoreClient.OpenFeatureClient, parsedParams);
            }
            else if (command == "variableValue")
            {
                result = await GetOpenFeatureVariableValue(dataStoreClient.OpenFeatureClient, parsedParams);
            }
            else
            {
                // For other commands, delegate to the underlying DevCycle client
                var parsedCommand = char.ToUpper(command[0]) + command.Substring(1);
                if (parsedCommand == "Close")
                {
                    parsedCommand = "Dispose";
                }

                MethodInfo? commandMethod = dataStoreClient.DvcClient.GetType().GetMethod(parsedCommand);
                if (parsedCommand == "SetClientCustomData")
                {
                    var customDataJson = parsedParams[0] as JObject;
                    var customDataDict = customDataJson.ToObject<Dictionary<string, object>>();
                    parsedParams[0] = customDataDict;
                }

                dynamic? task = commandMethod?.Invoke(dataStoreClient.DvcClient, parsedParams.ToArray());
                result = task == null ? result : (await task);
            }
        }
        else
        {
            // Handle regular DevCycle clients
            var parsedCommand = char.ToUpper(command[0]) + command.Substring(1);

            if (parsedCommand == "Close")
            {
                parsedCommand = "Dispose";
            }

            MethodInfo? commandMethod = entity.GetType().GetMethod(parsedCommand);
            if (command == "variable" || command == "variableValue")
            {
                Type defaultValueClass = parsedParams[parsedParams.Count - 1].GetType();
                // have to set the generic type for defaultValue before invoke
                commandMethod = commandMethod?.MakeGenericMethod(defaultValueClass);
            }
            else if (parsedCommand == "SetClientCustomData")
            {
                // need to convert from a JObject to a Dictionary<string, object> to match the method signature
                var customDataJson = parsedParams[0] as JObject;
                var customDataDict = customDataJson.ToObject<Dictionary<string, object>>();
                parsedParams[0] = customDataDict;
            }

            try
            {
                dynamic? task = commandMethod?.Invoke(entity, parsedParams.ToArray());
                result = task == null ? result : (await task);

                // Ensure result is serializable for variable commands
                if ((command == "variable" || command == "variableValue") && result != null)
                {
                    result = EnsureVariableSerializable(result);
                }
            }
            catch (Exception ex)
            {
                // Handle SDK exceptions for variable commands by returning a default variable
                if (command == "variable" || command == "variableValue")
                {
                    var key = parsedParams.Count > 1 ? parsedParams[1]?.ToString() ?? "unknown" : "unknown";
                    var defaultValue = parsedParams.Count > 2 ? parsedParams[2] : null;
                    var defaultValueType = defaultValue?.GetType().Name ?? "Object";

                    // Map .NET type names to DevCycle type names
                    var dvcType = defaultValueType switch
                    {
                        "String" => "String",
                        "Boolean" => "Boolean",
                        "Int32" or "Double" or "Decimal" => "Number",
                        _ => "JSON"
                    };

                    result = new
                    {
                        key = key,
                        value = EnsureSerializable(defaultValue),
                        defaultValue = EnsureSerializable(defaultValue),
                        isDefaulted = true,
                        type = dvcType,
                        evalReason = (object?)null,
                        eval = new
                        {
                            reason = "DEFAULT",
                            details = "Missing Config",
                            target_id = (string?)null
                        }
                    };
                }
                else
                {
                    throw; // Re-throw for non-variable commands
                }
            }
        }

        var resultId = DataStore.Commands.Count.ToString();
        if (result != null) DataStore.Commands.Add(resultId, result);

        var type = result != null ? GetEntityType(result, command) : "Void";

        return new CommandResult
        {
            EntityType = type,
            Data = result ?? new { },
            CommandId = resultId
        };
    }

    private string GetEntityType(object result, string command = "")
    {
        // Override entity type for variable commands
        if (command == "variable" || command == "variableValue")
        {
            return "Variable";
        }

        var type = TypeDescriptor.GetClassName(result) ?? "Object";
        if (type.Contains("Dictionary"))
        {
            type = "Object";
        }
        else
        {
            type = type.Split("`").First().Split(".").Last();
        }

        return EntityTypes.Contains(type) ? type : "Object";
    }
}
