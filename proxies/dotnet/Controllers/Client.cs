using Microsoft.AspNetCore.Mvc;
using DevCycle.SDK.Server.Cloud.Api;
using DevCycle.SDK.Server.Local.Api;
using DevCycle.SDK.Server.Common.Model.Local;
using DevCycle.SDK.Server.Common.Model.Cloud;
using Newtonsoft.Json;

namespace dotnet.Controllers;

public class ClientOptions : DVCLocalOptions
{
    [JsonProperty("configPollingIntervalMs")]
    public new int ConfigPollingIntervalMs { get; set; }

    [JsonProperty("eventFlushIntervalMS")]
    public new int EventFlushIntervalMs { get; set; }

    [JsonProperty("bucketingAPIURI")]
    public string? BucketingAPIURLOverride { get; set; }

    [JsonProperty("configCDNURI")] 
    public string? ConfigCDNURLOverride { get; set; }
    
    [JsonProperty("eventsAPIURI")] 
    public string? EventsAPIURLOverride { get; set; }
    
    [JsonProperty("enableEdgeDB")] 
    public bool? EnableEdgeDB { get; set; }
}

public class ClientRequestBody
{
    public string? ClientId { get; set; }

    public ClientOptions? Options { get; set; }

    public string? SdkKey { get; set; }

    public bool? EnableCloudBucketing { get; set; }

    public bool? WaitForInitialization { get; set; }
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
    public async Task<object> Post(ClientRequestBody ClientBody)
    {
        if (ClientBody.ClientId == null)
        {
            Response.StatusCode = 400;

            return new { message = "Invalid request: missing clientId" };
        }

        try
        {
            string? asyncError = null;
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

                if (ClientBody.WaitForInitialization == true) {
                    Task task = new Task(() => {});
                    DataStore.LocalClients[ClientBody.ClientId] = new DVCLocalClientBuilder()
                        .SetEnvironmentKey(ClientBody.SdkKey)
                        .SetInitializedSubscriber((o, e) =>
                        {
                            task.Start();
                            if (!e.Success)
                            {
                                asyncError = e.Errors.Last().ErrorResponse.Message;
                            }
                        })
                        .SetOptions(ClientBody.Options)
                        .SetLogger(new LoggerFactory())
                        .Build();

                        await task;
                } else {
                    DataStore.LocalClients[ClientBody.ClientId] = new DVCLocalClientBuilder()
                        .SetEnvironmentKey(ClientBody.SdkKey)
                        .SetOptions(ClientBody.Options)
                        .SetLogger(new LoggerFactory())
                        .Build();
                }
            }

            Response.Headers.Add("Location", "client/" + ClientBody.ClientId);
            Response.StatusCode = 201;

            if (asyncError != null)
            {
                return new { asyncError = asyncError };
            }

            return new { message = "success" };
        }
        catch (Exception e)
        {
            Response.StatusCode = 200;
            return new { exception = e.Message };
        }
    }
}