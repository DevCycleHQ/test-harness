using Microsoft.AspNetCore.Mvc;
using DevCycle.SDK.Server.Cloud.Api;
using DevCycle.SDK.Server.Local.Api;
using DevCycle.SDK.Server.Common.Model.Local;
using DevCycle.SDK.Server.Common.Model.Cloud;
using Newtonsoft.Json;
using System.Text;
using OpenFeature;

namespace dotnet.Controllers;

public class ClientOptions : DevCycleLocalOptions
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

    public override string ToString()
    {
        var sb = new StringBuilder();
        sb.Append("ClientOptions {").Append("\n");
        sb.Append("  ConfigPollingIntervalMs: ").Append(ConfigPollingIntervalMs).Append("\n");
        sb.Append("  EventFlushIntervalMs: ").Append(EventFlushIntervalMs).Append("\n");
        sb.Append("  BucketingAPIURLOverride: ").Append(BucketingAPIURLOverride).Append("\n");
        sb.Append("  ConfigCDNURLOverride: ").Append(ConfigCDNURLOverride).Append("\n");
        sb.Append("  EventsAPIURLOverride: ").Append(EventsAPIURLOverride).Append("\n");
        sb.Append("  EnableEdgeDB: ").Append(EnableEdgeDB).Append("\n");
        sb.Append("  DisableRealtimeUpdates: ").Append(base.DisableRealtimeUpdates).Append("\n");
        sb.Append("}");
        return sb.ToString();
    }
}

public class ClientRequestBody
{
    public string? ClientId { get; set; }

    public ClientOptions? Options { get; set; }

    public string? SdkKey { get; set; }

    public bool? EnableCloudBucketing { get; set; }

    public bool? WaitForInitialization { get; set; }

    public bool? UseOpenFeature { get; set; }
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
            object dvcClient = null;

            if (ClientBody.EnableCloudBucketing ?? false)
            {
                DevCycleCloudOptions cloudOptions = new DevCycleCloudOptions();

                if (ClientBody.Options != null)
                    cloudOptions = new DevCycleCloudOptions(enableEdgeDB: ClientBody.Options.EnableEdgeDB ?? false);

                var RestOptions = new DevCycle.SDK.Server.Common.API.DevCycleRestClientOptions();

                if (ClientBody.Options?.BucketingAPIURLOverride != null)
                    RestOptions.BaseUrl = new Uri(ClientBody.Options.BucketingAPIURLOverride);

                dvcClient = new DevCycleCloudClientBuilder()
                    .SetEnvironmentKey(ClientBody.SdkKey)
                    .SetOptions(cloudOptions)
                    .SetLogger(LoggerFactory.Create(builder => builder.AddConsole()))
                    .SetRestClientOptions(RestOptions)
                    .Build();

                DataStore.CloudClients[ClientBody.ClientId] = (DevCycleCloudClient)dvcClient;
            }
            else
            {
                if (ClientBody.Options == null)
                {
                    ClientBody.Options = new ClientOptions();
                }
                ClientBody.Options.DisableRealtimeUpdates = true;
                Console.WriteLine($"DisableRealtimeUpdates set to: {ClientBody.Options.DisableRealtimeUpdates}");

                if (ClientBody.Options.ConfigCDNURLOverride != null)
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
                    DevCycle.SDK.Server.Common.Model.DevCycleEventArgs? eventArgs = null;

                    dvcClient = new DevCycleLocalClientBuilder()
                        .SetEnvironmentKey(ClientBody.SdkKey)
                        .SetInitializedSubscriber((o, e) =>
                        {
                            eventArgs = e;
                            task.Start();
                        })
                        .SetOptions(ClientBody.Options)
                        .SetLogger(LoggerFactory.Create(builder => builder.AddConsole().SetMinimumLevel(LogLevel.Trace)))
                        .Build();

                        await task;
                        if (eventArgs != null && eventArgs.Errors.Count > 0) {
                            throw eventArgs.Errors[0];
                        }
                } else {
                    dvcClient = new DevCycleLocalClientBuilder()
                        .SetEnvironmentKey(ClientBody.SdkKey)
                        .SetOptions(ClientBody.Options)
                        .SetLogger(LoggerFactory.Create(builder => builder.AddConsole()))
                        .Build();
                }

                DataStore.LocalClients[ClientBody.ClientId] = (DevCycleLocalClient)dvcClient;
            }

            // If OpenFeature is requested, wrap the client
            if (ClientBody.UseOpenFeature ?? false)
            {
                var provider = ClientBody.EnableCloudBucketing ?? false 
                    ? ((DevCycleCloudClient)dvcClient).GetOpenFeatureProvider()
                    : ((DevCycleLocalClient)dvcClient).GetOpenFeatureProvider();

                await Api.Instance.SetProviderAsync(provider);
                var ofClient = Api.Instance.GetClient();

                DataStore.OpenFeatureClients[ClientBody.ClientId] = new DataStoreClient
                {
                    DvcClient = dvcClient,
                    OpenFeatureClient = ofClient,
                    IsOpenFeature = true
                };
            }

            Response.Headers.Add("Location", "client/" + ClientBody.ClientId);
            Response.StatusCode = 201;

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
