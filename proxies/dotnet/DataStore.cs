using DevCycle.SDK.Server.Cloud.Api;
using DevCycle.SDK.Server.Local.Api;
using dotnet.Models;
using OpenFeature;

public class DataStoreClient
{
    public object? DvcClient { get; set; }
    public IFeatureClient? OpenFeatureClient { get; set; }
    public bool IsOpenFeature { get; set; }
}

class DataStore
{
    public static Dictionary<string, DevCycleLocalClient> LocalClients;
    public static Dictionary<string, DevCycleCloudClient> CloudClients;
    public static Dictionary<string, OpenFeatureClientAdapter> OpenFeatureClients;

    public static Dictionary<string, object> Commands;

    static DataStore()
    {
        CloudClients = new Dictionary<string, DevCycleCloudClient>();
        LocalClients = new Dictionary<string, DevCycleLocalClient>();
        OpenFeatureClients = new Dictionary<string, OpenFeatureClientAdapter>();
        Commands = new Dictionary<string, object>();
    }
}
