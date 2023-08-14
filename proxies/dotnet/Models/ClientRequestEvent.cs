using Newtonsoft.Json;
using System.Runtime.Serialization;
using System.Text;

[DataContract]
public class ClientRequestEvent {
    [JsonProperty("type")]
    public string? Type { get; set; }

    [JsonProperty("target")]
    public string? Target { get; set; }

    [JsonProperty("value")]
    public double Value { get; set; }

    [JsonProperty("metaData")]
    public Dictionary<string, object>? MetaData { get; set; }

    [JsonProperty("date")]
    public DateTime? Date { get; set; }

    public override string ToString()
        {
            var sb = new StringBuilder();
            sb.Append("class ClientRequestEvent {\n");
            sb.Append("  Type: ").Append(Type).Append("\n");
            sb.Append("  Target: ").Append(Target).Append("\n");
            sb.Append("  Date: ").Append(Date).Append("\n");
            // sb.Append("  Value: ").Append(Value).Append("\n");
            sb.Append("  MetaData: ").Append(MetaData).Append("\n");
            sb.Append("}\n");
            return sb.ToString();
        }
}
