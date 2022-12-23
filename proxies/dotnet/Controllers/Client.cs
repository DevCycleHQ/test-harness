using Microsoft.AspNetCore.Mvc;
using DevCycle.SDK.Server.Cloud.Api;
using DevCycle.SDK.Server.Local.Api;
using DevCycle.SDK.Server.Common.Model.Local;
using DevCycle.SDK.Server.Common.Model.Cloud;
using Newtonsoft.Json;

namespace dotnet.Controllers;

public class ClientOptions : DVCLocalOptions
{
    [JsonProperty("eventFlushIntervalMS")]
    public int EventFlushIntervalMsOverride { get; set; }

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
                    .SetLogger(LoggerFactory.Create(builder => builder.AddConsole()))
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

                if (ClientBody.Options != null && ClientBody.Options.EventFlushIntervalMsOverride > 0)
                {
                    ClientBody.Options.EventFlushIntervalMs = ClientBody.Options.EventFlushIntervalMsOverride;
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
                        .SetLogger(LoggerFactory.Create(builder => builder.AddConsole()))
                        .Build();

                        await task;
                } else {
                    DataStore.LocalClients[ClientBody.ClientId] = new DVCLocalClientBuilder()
                        .SetEnvironmentKey(ClientBody.SdkKey)
                        .SetOptions(ClientBody.Options)
                        .SetLogger(LoggerFactory.Create(builder => builder.AddConsole()))
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
            Console.WriteLine(e);
            return new { exception = e.Message };
        }
    }
}
