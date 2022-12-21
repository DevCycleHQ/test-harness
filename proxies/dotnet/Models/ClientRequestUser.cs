using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using System;
using System.Collections.Generic;
using System.Runtime.Serialization;
using System.Text;
using static DevCycle.SDK.Server.Common.Model.User;

[DataContract]
public class ClientRequestUser {
    [JsonProperty("user_id")]
    public string? UserId { get; set; }

    [JsonProperty("email")]
    public string? Email { get; set; }

    [JsonProperty("country")]
    public string? Country { get; set; }

    [JsonProperty("language")]
    public string? Language { get; set; }

    [JsonProperty("name")]
    public string? Name { get; set; }

    [JsonProperty("customData")]
    public Dictionary<string, object>? CustomData { get; set; }

    [JsonProperty("privateCustomData")]
    public Dictionary<string, object>? PrivateCustomData { get; set; }

    [JsonProperty("deviceModel")]
    public string? DeviceModel { get; set; }

    [JsonProperty("platformVersion")]
    public string? PlatformVersion { get; set; }

    [JsonProperty("platorm")]
    public string? Platform { get; set; }

    [JsonProperty("lastSeenDate")]
    public DateTime LastSeenDate { get; set; }
    
    [JsonProperty("createdDate")]
    public DateTime CreatedDate { get; set; }

    [JsonProperty("appBuild")]
    public double AppBuild { get; set; }
    
    [JsonProperty("appVersion")]
    public string? AppVersion { get; set; }
    
    [JsonProperty("sdkType")]
    public SdkTypeEnum? SdkType { get; set; }

    [JsonProperty("sdkVersion")]
    public string? SdkVersion { get; set; }

    public override string ToString()
        {
            var sb = new StringBuilder();
            sb.Append("class ClientRequestUser {\n");
            sb.Append("  UserId: ").Append(UserId).Append("\n");
            sb.Append("  Email: ").Append(Email).Append("\n");
            sb.Append("  Name: ").Append(Name).Append("\n");
            sb.Append("  Language: ").Append(Language).Append("\n");
            sb.Append("  Country: ").Append(Country).Append("\n");
            sb.Append("  AppVersion: ").Append(AppVersion).Append("\n");
            sb.Append("  AppBuild: ").Append(AppBuild).Append("\n");
            sb.Append("  CustomData: ").Append(CustomData).Append("\n");
            sb.Append("  PrivateCustomData: ").Append(PrivateCustomData).Append("\n");
            sb.Append("  CreatedDate: ").Append(CreatedDate).Append("\n");
            sb.Append("  LastSeenDate: ").Append(LastSeenDate).Append("\n");
            sb.Append("  Platform: ").Append(Platform).Append("\n");
            sb.Append("  PlatformVersion: ").Append(PlatformVersion).Append("\n");
            sb.Append("  DeviceModel: ").Append(DeviceModel).Append("\n");
            sb.Append("  SdkType: ").Append(SdkType).Append("\n");
            sb.Append("  SdkVersion: ").Append(SdkVersion).Append("\n");
            sb.Append("}\n");
            return sb.ToString();
        }
}
