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
    public string? ClientId { get; set;}
    public ClientOptions? Options { get; set;}

    public string? SdkKey { get; set;}

    public bool? EnableCloudBucketing { get; set; }
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
    public object Post(ClientRequestBody ClientBody)
    {
        if (ClientBody.ClientId == null) {
            Response.StatusCode = 400;

            return new { message = "Invalid request: missing clientId" };
        }

        try {
            if (ClientBody.EnableCloudBucketing ?? false) {
                DVCCloudOptions cloudOptions = new DVCCloudOptions();

                if (ClientBody.Options != null) {
                    cloudOptions = new DVCCloudOptions(enableEdgeDB: ClientBody.Options.EnableEdgeDB ?? false);
                }

                var RestOptions = new DevCycle.SDK.Server.Common.API.DVCRestClientOptions();

                if (ClientBody.Options?.BaseURLOverride != null) {
                    RestOptions.BaseUrl = new Uri(ClientBody.Options.BaseURLOverride);
                }

                DataStore.CloudClients[ClientBody.ClientId] = new DVCCloudClientBuilder()
                    .SetEnvironmentKey(ClientBody.SdkKey)
                    .SetOptions(cloudOptions)
                    .SetLogger(new LoggerFactory())
                    .SetRestClientOptions(RestOptions)
                    .Build();
            } else {
                if (ClientBody.Options != null && ClientBody.Options.BaseURLOverride != null) {
                    ClientBody.Options.CdnUri = ClientBody.Options.BaseURLOverride;
                    ClientBody.Options.EventsApiUri = ClientBody.Options.BaseURLOverride;
                }
            
                DataStore.LocalClients[ClientBody.ClientId] = new DVCLocalClientBuilder()
                    .SetEnvironmentKey(ClientBody.SdkKey)
                    .SetOptions(ClientBody.Options)        
                    .SetLogger(new LoggerFactory())
                    .Build();
            }

            Response.Headers.Add("Location", "client/" + ClientBody.ClientId);
            Response.StatusCode = 201;

            return new { message = "success"};
        } catch (Exception e) {
            Response.StatusCode = 200;
            return new { exception = e.Message};
        }
    }
}
