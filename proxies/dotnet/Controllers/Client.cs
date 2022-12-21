using Microsoft.AspNetCore.Mvc;
using DevCycle.SDK.Server.Cloud.Api;
using DevCycle.SDK.Server.Local.Api;
using DevCycle.SDK.Server.Common.Model.Local;
using DevCycle.SDK.Server.Common.Model.Cloud;
using System.Text.Json.Serialization;

namespace dotnet.Controllers;

public class ClientOptions : DVCLocalOptions
{
    [JsonPropertyName("configPollingIntervalMs")]
    public new int ConfigPollingIntervalMs { get; set; }

    [JsonPropertyName("eventFlushIntervalMS")]
    public new int EventFlushIntervalMs { get; set; }

    [JsonPropertyName("bucketingAPIURI")]
    public string? BucketingAPIURLOverride { get; set; }

    [JsonPropertyName("configCDNURI")] 
    public string? ConfigCDNURLOverride { get; set; }
    
    [JsonPropertyName("eventsAPIURI")] 
    public string? EventsAPIURLOverride { get; set; }
    
    [JsonPropertyName("enableEdgeDB")] 
    public bool? EnableEdgeDB { get; set; }
}

public class ClientRequestBody
{
    public string? ClientId { get; set; }
    public ClientOptions? Options { get; set; }

    public string? SdkKey { get; set; }

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
        if (ClientBody.ClientId == null)
        {
            Response.StatusCode = 400;

            return new { message = "Invalid request: missing clientId" };
        }

        try
        {
            if (ClientBody.EnableCloudBucketing ?? false)
            {
                DVCCloudOptions cloudOptions = new DVCCloudOptions();

                if (ClientBody.Options != null)
                    cloudOptions = new DVCCloudOptions(enableEdgeDB: ClientBody.Options.EnableEdgeDB ?? false);

                var RestOptions = new DevCycle.SDK.Server.Common.API.DVCRestClientOptions();

                if (ClientBody.Options?.BucketingAPIURLOverride != null)
                    RestOptions.BaseUrl = new Uri(ClientBody.Options.BucketingAPIURLOverride);

                DataStore.CloudClients[ClientBody.ClientId] = new DVCCloudClientBuilder()
                    .SetEnvironmentKey(ClientBody.SdkKey)
                    .SetOptions(cloudOptions)
                    .SetLogger(new LoggerFactory())
                    .SetRestClientOptions(RestOptions)
                    .Build();
            }
            else
            {
                if (ClientBody.Options?.ConfigCDNURLOverride != null)
                {
                    ClientBody.Options.CdnUri = ClientBody.Options.ConfigCDNURLOverride;
                }

                if (ClientBody.Options?.EventsAPIURLOverride != null)
                {
                    ClientBody.Options.EventsApiUri = ClientBody.Options.EventsAPIURLOverride;
                }

                DataStore.LocalClients[ClientBody.ClientId] = new DVCLocalClientBuilder()
                    .SetEnvironmentKey(ClientBody.SdkKey)
                    .SetOptions(ClientBody.Options)
                    .SetLogger(new LoggerFactory())
                    .Build();
            }

            Response.Headers.Add("Location", "client/" + ClientBody.ClientId);
            Response.StatusCode = 201;

            return new { message = "success" };
        }
        catch (Exception e)
        {
            Response.StatusCode = 200;
            return new { exception = e.Message };
        }
    }
}