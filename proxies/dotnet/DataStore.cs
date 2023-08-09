using DevCycle.SDK.Server.Cloud.Api;
using DevCycle.SDK.Server.Local.Api;

class DataStore
{
    public static Dictionary<string, DevCycleLocalClient> LocalClients;
    public static Dictionary<string, DevCycleCloudClient> CloudClients;

    public static Dictionary<string, object> Commands;

    static DataStore()
    {
        CloudClients = new Dictionary<string, DevCycleCloudClient>();
        LocalClients = new Dictionary<string, DevCycleLocalClient>();
        Commands = new Dictionary<string, object>();
    }
}