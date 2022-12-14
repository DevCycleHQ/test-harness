using Microsoft.AspNetCore.Mvc;
using DevCycle.SDK.Server.Cloud.Api;
using DevCycle.SDK.Server.Local.Api;
using DevCycle.SDK.Server.Common.Model.Local;
using DevCycle.SDK.Server.Common.Model.Cloud;
using System.Text.Json.Serialization;

namespace dotnet.Controllers;

public class ClientOptions: DVCLocalOptions
    {
        [JsonPropertyName("configPollingIntervalMs")]
        new public int ConfigPollingIntervalMs { get; set; }

        [JsonPropertyName("eventFlushIntervalMS")]
        new public int EventFlushIntervalMs { get; set; }

        [JsonPropertyName("baseURLOverride")]
        public string? BaseURLOverride { get; set; }

        [JsonPropertyName("enableEdgeDB")]
        public bool? EnableEdgeDB { get; set; }
    }

public class ClientRequestBody {
    public string? clientId { get; set;}
    public ClientOptions? options { get; set;}

    public string? sdkKey { get; set;}

    public bool? enableCloudBucketing { get; set; }
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
        if (clientBody.clientId == null) {
            Response.StatusCode = 400;

            return new { message = "Invalid request: missing clientId" };
        }

        try {
            if (clientBody.enableCloudBucketing ?? false) {
                DVCCloudOptions cloudOptions = new DVCCloudOptions();

                if (clientBody.options != null) {
                    cloudOptions = new DVCCloudOptions(enableEdgeDB: clientBody.options.EnableEdgeDB ?? false);
                }

                DataStore.CloudClients[clientBody.clientId] = new DVCCloudClientBuilder()
                    .SetEnvironmentKey(clientBody.sdkKey)
                    .SetOptions(cloudOptions)
                    .SetLogger(new LoggerFactory())
                    .Build();
            } else {
                if (clientBody.options != null && clientBody.options.BaseURLOverride != null) {
                    clientBody.options.CdnUri = clientBody.options.BaseURLOverride;
                    clientBody.options.EventsApiUri = clientBody.options.BaseURLOverride;
                }
            
                DataStore.LocalClients[clientBody.clientId] = new DVCLocalClientBuilder()
                    .SetEnvironmentKey(clientBody.sdkKey)
                    .SetOptions(clientBody.options)        
                    .SetLogger(new LoggerFactory())
                    .Build();
            }

            Response.Headers.Add("Location", "client/" + clientBody.clientId);
            Response.StatusCode = 201;

            return new { message = "success"};
        } catch (Exception e) {
            Response.StatusCode = 200;
            return new { exception = e.Message};
        }
    }
}
