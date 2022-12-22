using DevCycle.SDK.Server.Cloud.Api;
using DevCycle.SDK.Server.Local.Api;
using DevCycle.SDK.Server.Common.Model;

class DataStore
{
    public static Dictionary<string, DVCLocalClient> LocalClients;
    public static Dictionary<string, DVCCloudClient> CloudClients;

    public static Dictionary<string, object> Commands;

    static DataStore()
    {
        CloudClients = new Dictionary<string, DVCCloudClient>();
        LocalClients = new Dictionary<string, DVCLocalClient>();
        Commands = new Dictionary<string, object>();
    }
}