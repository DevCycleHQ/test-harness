using System.ComponentModel.DataAnnotations;
using DevCycle.SDK.Server.Cloud.Api;
using DevCycle.SDK.Server.Local.Api;
using DevCycle.SDK.Server.Common.Model;
using Microsoft.AspNetCore.Mvc;
using System.Reflection;
using System.ComponentModel;
using Newtonsoft.Json.Linq;

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
                    result.Add(param["value"]);
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
            if (DataStore.CloudClients.TryGetValue(id, out DevCycleCloudClient? cloudClient))
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

    private async Task<CommandResult> InvokeCommand(object entity, string command, bool isAsync,
        List<object> parsedParams)
    {
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

        object result = null;

        dynamic? task = commandMethod?.Invoke(entity, parsedParams.ToArray());
        result = task == null ? result : (await task);


        var resultId = DataStore.Commands.Count.ToString();
        if (result != null) DataStore.Commands.Add(resultId, result);

        var type = result != null ? GetEntityType(result) : "Void";

        return new CommandResult
        {
            EntityType = type,
            Data = result ?? new { },
            CommandId = resultId
        };
    }

    private string GetEntityType(object result)
    {
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