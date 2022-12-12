using Microsoft.AspNetCore.Mvc;
using DevCycle.SDK.Server.Cloud.Api;
using DevCycle.SDK.Server.Local.Api;
using DevCycle.SDK.Server.Common.Model.Local;
using DevCycle.SDK.Server.Common.Model.Cloud;
using System.Text.Json.Serialization;

namespace dotnet.Controllers;

public class AllOptions: DVCLocalOptions {
    [JsonPropertyName("enableEdgeDB")]
    public bool EnableEdgeDB { get; set; }
}

public class ClientRequestBody {
    public string clientId { get; set;}
    public AllOptions options { get; set;}

    public string? sdkKey { get; set;}

    public bool? cloudBucketing { get; set; }
}

[ApiController]
[Route("[controller]")]
public class ClientController : ControllerBase
{

    private readonly ILogger<ClientController> _logger;

    public ClientController(ILogger<ClientController> logger)
    {
        _logger = logger;
    }

    [HttpPost]
    public object Post(ClientRequestBody clientBody)
    {
        if (clientBody.cloudBucketing ?? false) {
            DataStore.CloudClients[clientBody.clientId] = (DVCCloudClient) new DVCCloudClientBuilder()
                .SetEnvironmentKey(clientBody.sdkKey)
                .SetOptions(new DVCCloudOptions(enableEdgeDB: clientBody.options.EnableEdgeDB))
                .SetLogger(new LoggerFactory())
                .Build();
        } else {
            DataStore.LocalClients[clientBody.clientId] = (DVCLocalClient) new DVCLocalClientBuilder()
                .SetEnvironmentKey(clientBody.sdkKey)
                .SetOptions(clientBody.options)
                .SetLogger(new LoggerFactory())
                .Build();
        }

        Response.Headers.Add("Location", "client/" + clientBody.clientId);
        Response.StatusCode = 201;

        return new { message = "success"};
    }
}
