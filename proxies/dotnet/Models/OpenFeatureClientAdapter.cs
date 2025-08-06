using DevCycle.SDK.Server.Common.Model;
using Newtonsoft.Json.Linq;
using OpenFeature;
using OpenFeature.Model;


namespace dotnet.Models;

public class OpenFeatureClientAdapter(FeatureClient client)
{
    public async Task<DVCVariable<T>> Variable<T>(DevCycleUser user, string key, T defaultValue)
    {
        var methodName = GetMethodNameForType<T>();
        var clientMethod = typeof(FeatureClient).GetMethod(methodName);

        if (clientMethod == null)
            throw new InvalidOperationException($"Method {methodName} not found on FeatureClient");

        var context = DvcUserToContext(user);
        var convertedDefault = ConvertDefaultValue(defaultValue);

        dynamic task = clientMethod.Invoke(client, new object[] { key, convertedDefault, context, null, null });
        var result = await task;

        return DVCVariable<T>.FromFlagEvaluationDetails<T>(result, defaultValue);
    }

    public async Task<T> VariableValue<T>(DevCycleUser user, string key, T defaultValue)
    {
        var methodName = GetValueMethodNameForType<T>();
        var clientMethod = typeof(FeatureClient).GetMethod(methodName);

        if (clientMethod == null)
            throw new InvalidOperationException($"Method {methodName} not found on FeatureClient");

        var context = DvcUserToContext(user);
        var convertedDefault = ConvertDefaultValue(defaultValue);

        dynamic task = clientMethod.Invoke(client, new object[] { key, convertedDefault, context, null, null });
        var result = await task;

        return result;
    }

    private string GetMethodNameForType<T>()
    {
        return typeof(T) switch
        {
            Type t when t == typeof(string) => "GetStringDetailsAsync",
            Type t when t == typeof(int) => "GetIntegerDetailsAsync",
            Type t when t == typeof(bool) => "GetBooleanDetailsAsync",
            Type t when t == typeof(JObject) => "GetObjectDetailsAsync",
            _ => throw new ArgumentException($"Unsupported type: {typeof(T)}")
        };
    }

    private string GetValueMethodNameForType<T>()
    {
        return typeof(T) switch
        {
            Type t when t == typeof(string) => "GetStringValueAsync",
            Type t when t == typeof(int) => "GetIntegerValueAsync",
            Type t when t == typeof(bool) => "GetBooleanValueAsync",
            Type t when t == typeof(JObject) => "GetObjectValueAsync",
            _ => throw new ArgumentException($"Unsupported type: {typeof(T)}")
        };
    }

    private object ConvertDefaultValue<T>(T defaultValue)
    {
        return defaultValue switch
        {
            JObject jobj => new Value(jobj),
            _ => defaultValue
        };
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
