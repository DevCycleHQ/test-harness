using Microsoft.AspNetCore.Mvc;
using DevCycle.SDK.Server.Cloud.Api;
using DevCycle.SDK.Server.Local.Api;
using DevCycle.SDK.Server.Common.Model;
using DevCycle.SDK.Server.Common;

namespace dotnet.Controllers;

public class ClientRequestBody {
    public string clientId { get; set;}
    public Dictionary<string, object> options { get; set;}
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
            DVCCloudClientBuilder builder = new DVCCloudClientBuilder();
            builder.SetEnvironmentKey(clientBody.sdkKey);
            builder.SetOptions(clientBody.options as IDVCOptions);
            DataStore.CloudClients[clientBody.clientId] = (DVCCloudClient) builder.Build();
        } else {
            DVCLocalClientBuilder builder = new DVCLocalClientBuilder();
            builder.SetEnvironmentKey(clientBody.sdkKey);
            builder.SetOptions(clientBody.options as IDVCOptions);
            DataStore.LocalClients[clientBody.clientId] = (DVCLocalClient) builder.Build();
        }

        Response.Headers.Add("Location", "client/" + clientBody.clientId);

        return new { message = "success"};
    }
}
