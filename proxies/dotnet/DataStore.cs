using DevCycle.SDK.Server.Cloud.Api;
using DevCycle.SDK.Server.Local.Api;
using DevCycle.SDK.Server.Common.Model;
using DevCycle.SDK.Server.Common.API;

class DataStore {
    public static Dictionary<string, IDVCClient> LocalClients;
    public static Dictionary<string, IDVCClient> CloudClients;

    public static Dictionary<string, User> Users;
    public static Dictionary<string, Event> Events;
    public static Dictionary<string, object> Commands;

    static DataStore()
    {
        CloudClients = new Dictionary<string, IDVCClient>();
        LocalClients = new Dictionary<string, IDVCClient>();
        Users = new Dictionary<string, User>();
        Events = new Dictionary<string, Event>();
        Commands = new Dictionary<string, object>();
    }
}