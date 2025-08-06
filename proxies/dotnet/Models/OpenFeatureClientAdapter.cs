using DevCycle.SDK.Server.Common.Model;
using Newtonsoft.Json.Linq;
using OpenFeature;
using OpenFeature.Model;


namespace dotnet.Models;

public class OpenFeatureClientAdapter(FeatureClient client)
{
    public async Task<DVCVariable<string>> Variable(DevCycleUser user, string key, string defaultValue)
    {
        var result = await client.GetStringDetailsAsync(key, defaultValue, DvcUserToContext(user));
        return DVCVariable<string>.FromFlagEvaluationDetails<string>(result, defaultValue);
    }

    public async Task<DVCVariable<int>> Variable(DevCycleUser user, string key, int defaultValue)
    {
        var result = await client.GetIntegerDetailsAsync(key, defaultValue, DvcUserToContext(user));
        return DVCVariable<int>.FromFlagEvaluationDetails<int>(result, defaultValue);
    }

    public async Task<DVCVariable<bool>> Variable(DevCycleUser user, string key, bool defaultValue)
    {
        var result = await client.GetBooleanDetailsAsync(key, defaultValue, DvcUserToContext(user));
        return DVCVariable<bool>.FromFlagEvaluationDetails<bool>(result, defaultValue);
    }

    public async Task<DVCVariable<Value>> Variable(DevCycleUser user, string key, JObject defaultValue)
    {
        var result = await client.GetObjectDetailsAsync(key, new Value(defaultValue), DvcUserToContext(user));
        return DVCVariable<Value>.FromFlagEvaluationDetails<Value>(result, new Value(defaultValue));
    }

    public async Task<string> VariableValue(DevCycleUser user, string key, string defaultValue)
    {
        var result = await client.GetStringDetailsAsync(key, defaultValue, DvcUserToContext(user));
        return result.Value;
    }

    public async Task<int> VariableValue(DevCycleUser user, string key, int defaultValue)
    {
        var result = await client.GetIntegerDetailsAsync(key, defaultValue, DvcUserToContext(user));
        return result.Value;
    }

    public async Task<bool> VariableValue(DevCycleUser user, string key, bool defaultValue)
    {
        var result = await client.GetBooleanDetailsAsync(key, defaultValue, DvcUserToContext(user));
        return result.Value;
    }

    public async Task<Value> VariableValue(DevCycleUser user, string key, JObject defaultValue)
    {
        var result = await client.GetObjectDetailsAsync(key, new Value(defaultValue), DvcUserToContext(user));
        return result.Value;
    }

    private Dictionary<string, object> ParseMetadata(ImmutableMetadata? metadata)
    {
        var serializableMetadata = new Dictionary<string, object>();
        var evalReasonDetails = metadata?.GetString("evalReasonDetails");
        var evalReasonTargetId = metadata?.GetString("evalReasonTargetId");

        if (!string.IsNullOrEmpty(evalReasonDetails))
            serializableMetadata["evalReasonDetails"] = evalReasonDetails;
        if (!string.IsNullOrEmpty(evalReasonTargetId))
            serializableMetadata["evalReasonTargetId"] = evalReasonTargetId;

        return serializableMetadata;
    }

    private EvaluationContext DvcUserToContext(DevCycleUser user)
    {
        var contextBuilder = EvaluationContext.Builder()
            .Set("userId", user.UserId ?? "");

        return contextBuilder.Build();
    }

}
