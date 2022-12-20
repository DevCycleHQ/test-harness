using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using DevCycle.SDK.Server.Cloud.Api;
using DevCycle.SDK.Server.Local.Api;
using DevCycle.SDK.Server.Common.Model;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using DevCycle.SDK.Server.Common.Model.Cloud;
using DevCycle.SDK.Server.Common.API;
using System.Reflection;
using System.ComponentModel;

namespace dotnet.Controllers;

public class PostBody
{
    [Required]
    public string Command { get; set; } = "";

    [Required]
    public bool IsAsync { get; set; } = false;

    [Required]
    public List<JsonElement> Params { get; set; } = new List<JsonElement>{};
}

public class CommandResult
{
    [Required]
    public string EntityType { get; set; } = "";

    [Required]
    public object Data { get; set; } = new Object{};

    public List<string>? Logs { get; set; } = new List<string>{};

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

    private static string[] EntityTypes = new[] {"User","Variable","Feature", "Object", "Client"};

    [HttpPost]
    [Route("/{**location}")]
    public async Task<object> Post([FromBody] PostBody body, string location)
    {
        if (location.Length == 0) {
            Response.StatusCode = 400;
            return new { message = "Invalid request: missing location" };
        }

        object entity;
        List<object> parsedParams;
        
        try {
           entity = GetEntity(location);
           parsedParams = ParseParams(body.Params);
        } catch (Exception e) {
            Response.StatusCode = 404;
            return new { message = e.Message };
        }
        
        try {
            var result = await InvokeCommand(entity, body.Command, body.IsAsync, parsedParams);
            
            Response.StatusCode = 201;
            if (result.CommandId != null) Response.Headers.Add("Location", $"command/{body.Command}/{result.CommandId}");
            
            return new {
                entityType = result.EntityType,
                data = result.Data,
                logs = result.Logs
            };

        } catch (Exception e) {
            Response.StatusCode = 200;

            if (body.IsAsync) {
                return new {
                    asyncError = e.Message,
                    stack = e.StackTrace,
                };
            } else {
                return new {
                    exception = e.Message,
                    stack = e.StackTrace,
                };
            }
        }
    }

    private List<object> ParseParams(List<JsonElement> bodyParams) {
        var result = new List<object>{};

        foreach (var param in bodyParams) {
            if (param.TryGetProperty("location", out System.Text.Json.JsonElement location)) {
                result.Add(GetEntity(location.ToString()));
            } else if (param.TryGetProperty("value", out System.Text.Json.JsonElement value)) {
                if (value.ValueKind == JsonValueKind.Number) {
                    result.Add(value.GetDecimal());
                } else if (value.ValueKind == JsonValueKind.String) {
                    result.Add(value.GetString() ?? "");
                } else if (value.ValueKind == JsonValueKind.Object) {
                    result.Add(value);
                } else {
                    result.Add(value.GetBoolean());
                }
            }
        }
        return result;
    }

    private object GetEntity(string location) {
        var parts = location.Split('/');
        var type = parts[0];
        var id = parts[1];

        object? result = null;
        if (type == "client") {
           if (DataStore.CloudClients.TryGetValue(id, out DVCCloudClient? cloudClient)) {
                result = cloudClient;
           } else if (DataStore.LocalClients.TryGetValue(id, out DVCLocalClient? localClient)) {
                result = localClient;
           } 
        } else if (type == "user" && DataStore.Users.TryGetValue(id, out User? user)) {
            result = user;
        } else if (type == "command" && DataStore.Commands.TryGetValue(id, out object? command)) {
            result = command;
        }
        if (result == null) {
            throw new Exception($"Entity {location} not found");
        }
        return result;
    }

    private async Task<CommandResult> InvokeCommand(object entity, string command, bool isAsync, List<object> parsedParams) {
        var parsedCommand = char.ToUpper(command[0]) + command.Substring(1);
        parsedCommand = entity is DVCCloudClient ? parsedCommand + "Async" : parsedCommand;

        MethodInfo? commandMethod = entity.GetType().GetMethod(parsedCommand);
        if (command == "variable") {
            Type defaultValueClass = parsedParams[parsedParams.Count - 1].GetType();
            commandMethod = commandMethod?.MakeGenericMethod(defaultValueClass); // have to set the generic type for defaultValue before invoke 
        }

        object result = new {};

        if (isAsync) {              
            dynamic? task = commandMethod?.Invoke(entity, parsedParams.ToArray());
            result = (await task) ?? result;
        } else {
            result = commandMethod?.Invoke(entity, parsedParams.ToArray()) ?? result;
        }

        var resultId = DataStore.Commands.Count.ToString();
        if (result != null) DataStore.Commands.Add(resultId, result);

        var type = result != null ? GetEntityType(result) : "Void";

        return new CommandResult {
            EntityType = type, 
            Data = result ?? new {},
            CommandId = resultId
        };
    }

    private string GetEntityType(object result) {
        var type = TypeDescriptor.GetClassName(result) ?? "Object";
        if (type.Contains("Dictionary")) {
            type = "Object";
        } else {
            type = type.Split('`').First().Split(".").Last();
        }

        return EntityTypes.Contains(type) ? type : "Void";
    }
}
