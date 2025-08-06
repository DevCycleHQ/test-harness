using DevCycle.SDK.Server.Common.Model;
using Newtonsoft.Json.Linq;
using OpenFeature;
using OpenFeature.Model;


namespace dotnet.Models;

public class OpenFeatureClientAdapter(FeatureClient client)
{
    public async Task<Variable<T>> Variable<T>(DevCycleUser user, string key, T defaultValue)
    {
        var methodName = GetMethodNameForType<T>();
        var clientMethod = typeof(FeatureClient).GetMethod(methodName);

        if (clientMethod == null)
            throw new InvalidOperationException($"Method {methodName} not found on FeatureClient");

        var context = DvcUserToContext(user);
        var convertedDefault = ConvertDefaultValue(defaultValue);

        dynamic task = clientMethod.Invoke(client, new object[] { key, convertedDefault, context, null, null });
        var result = await task;

        return Models.Variable<T>.FromFlagEvaluationDetails<T>(result, defaultValue);
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

    private EvaluationContext DvcUserToContext(DevCycleUser user)
    {
        var contextBuilder = EvaluationContext.Builder()
                .Set("user_id", user.UserId)
                .Set("email", user.Email)
                .Set("name", user.Name)
                .Set("language", user.Language)
                .Set("country", user.Country)
                .Set("appVersion", user.AppVersion)
                .Set("appBuild", user.AppBuild)
                .Set("platform", user.Platform)
                .Set("platformVersion", user.PlatformVersion)
                .Set("createdDate", user.CreatedDate.ToString())
                .Set("lastSeenDate", user.LastSeenDate.ToString())
                .Set("deviceModel", user.DeviceModel)
                .Set("sdkVersion", user.SdkVersion)
                .Set("customData", new Structure(user.CustomData.ToDictionary(
                    kvp => kvp.Key,
                    kvp => new Value(kvp.Value)
                )))
                .Set("privateCustomData", new Structure(user.CustomData.ToDictionary(
                    kvp => kvp.Key,
                    kvp => new Value(kvp.Value)
                )))
            ;
        return contextBuilder.Build();
    }

}
