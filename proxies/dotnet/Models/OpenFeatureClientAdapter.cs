using DevCycle.SDK.Server.Common.Model;
using OpenFeature;
using OpenFeature.Model;


namespace dotnet.Models;

public class OpenFeatureClientAdapter(FeatureClient client)
{
    public async Task<Variable<T>> Variable<T>(DevCycleUser user, string key, T defaultValue)
    {
        var evalDetails = await HandleInvoke<T>(true, user, key, defaultValue);
        return Models.Variable<T>.FromFlagEvaluationDetails<T>((FlagEvaluationDetails<T>)evalDetails, defaultValue);
    }

    public async Task<T> VariableValue<T>(DevCycleUser user, string key, T defaultValue)
    {
        return await HandleInvoke<T>(false, user, key, defaultValue);
    }

    private dynamic HandleInvoke<T>(bool getDetails, DevCycleUser user, string key, T defaultValue)
    {
        var methodName = GetMethodNameForType<T>(getDetails);
        var clientMethod = typeof(FeatureClient).GetMethod(methodName);

        if (clientMethod == null)
            throw new InvalidOperationException($"Method {methodName} not found on FeatureClient");

        var context = DvcUserToContext(user);
        return clientMethod.Invoke(client, new object[] { key, defaultValue, context, null, null });
    }

    private string GetMethodNameForType<T>(bool getDetails = false)
    {

        var postfix = getDetails ? "Details" : "Value";
        return typeof(T) switch
        {
            Type t when t == typeof(string) => $"GetString{postfix}Async",
            Type t when t == typeof(int) => $"GetInteger{postfix}Async",
            Type t when t == typeof(bool) => $"GetBoolean{postfix}Async",
            Type t when t == typeof(object) => $"GetObject{postfix}Async",
            _ => throw new ArgumentException($"Unsupported type: {typeof(T)}")
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
