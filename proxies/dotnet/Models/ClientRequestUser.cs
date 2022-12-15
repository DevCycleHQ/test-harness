using System.Text.Json.Serialization;
using Newtonsoft.Json;

using DevCycle.SDK.Server.Cloud.Api;
using DevCycle.SDK.Server.Local.Api;
using DevCycle.SDK.Server.Common.Model;
using static DevCycle.SDK.Server.Common.Model.User;

public class ClientRequestUser {
    [JsonPropertyName("user_id")]
    public string? UserId { get; set; }

    [JsonPropertyName("email")]
    public string? Email { get; set; }

    [JsonPropertyName("country")]
    public string? Country { get; set; }

    [JsonPropertyName("language")]
    public string? Language { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("customData")]
    public Dictionary<string, object>? CustomData { get; set; }

    [JsonPropertyName("privateCustomData")]
    public Dictionary<string, object>? PrivateCustomData { get; set; }

    [JsonPropertyName("deviceModel")]
    public string? DeviceModel { get; set; }

    [JsonPropertyName("platformVersion")]
    public string? PlatformVersion { get; set; }

    [JsonPropertyName("platform")]
    public string? Platform { get; set; }

    [JsonPropertyName("lastSeenDate")]
    public DateTime LastSeenDate { get; set; }
    
    [JsonPropertyName("createdDate")]
    public DateTime CreatedDate { get; set; }

    [JsonPropertyName("appBuild")]
    public double AppBuild { get; set; }
    
    [JsonPropertyName("appVersion")]
    public string? AppVersion { get; set; }
    
    [JsonPropertyName("sdkType")]
    public SdkTypeEnum? SdkType { get; set; }

    [JsonPropertyName("sdkVersion")]
    public string? SdkVersion { get; set; }
}