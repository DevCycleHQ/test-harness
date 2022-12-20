using System.Text.Json.Serialization;
public class EventsRequest {
        [JsonPropertyName("type")]
        public string? Type { get; set; }

        [JsonPropertyName("target")]
        public string? Target { get; set; }

        [JsonPropertyName("date")]
        public DateTime? Date { get; set; }

        [JsonPropertyName("value")]
        public double Value { get; set; }

        [JsonPropertyName("metaData")]
        public Dictionary<string, object>? MetaData { get; set; }
}