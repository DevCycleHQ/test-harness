using DevCycle.SDK.Server.Common.Model;
using OpenFeature;
using OpenFeature.Model;


namespace dotnet.Models;

public class OpenFeatureClientAdapter(FeatureClient client)
{
    public async Task<DVCVariable<T>> Variable<T>(DevCycleUser user, string key, T defaultValue)
    {
        var context = ConvertUserToEvaluationContext(user);
        var type = DevCycle.SDK.Server.Common.Model.Variable<T>.DetermineType(defaultValue);

        dynamic variableEval = type switch
        {
            TypeEnum.String => await client.GetStringDetailsAsync(key, (string)(object)defaultValue!, context),
            TypeEnum.Number => await client.GetIntegerDetailsAsync(key, (int)(object)defaultValue!, context),
            TypeEnum.Boolean => await client.GetBooleanDetailsAsync(key, (bool)(object)defaultValue!, context),
            TypeEnum.JSON => await client.GetObjectDetailsAsync(key, (Value)(object)defaultValue!, context),
            _ => throw new ArgumentException($"Unsupported type: {type}")
        };

        return DVCVariable<T>.FromFlagEvaluationDetails<T>(variableEval, defaultValue);
    }

    private EvaluationContext ConvertUserToEvaluationContext(DevCycleUser user)
    {
        var contextBuilder = EvaluationContext.Builder()
            .Set("targetingKey", user.UserId ?? "");

        if (!string.IsNullOrEmpty(user.Email))
            contextBuilder.Set("email", user.Email);
        if (!string.IsNullOrEmpty(user.Name))
            contextBuilder.Set("name", user.Name);
        if (!string.IsNullOrEmpty(user.Language))
            contextBuilder.Set("language", user.Language);
        if (!string.IsNullOrEmpty(user.Country))
            contextBuilder.Set("country", user.Country);
        if (!string.IsNullOrEmpty(user.AppVersion))
            contextBuilder.Set("appVersion", user.AppVersion);
        if (user.AppBuild != 0)
            contextBuilder.Set("appBuild", user.AppBuild.ToString());
        if (!string.IsNullOrEmpty(user.Platform))
            contextBuilder.Set("platform", user.Platform);
        if (!string.IsNullOrEmpty(user.PlatformVersion))
            contextBuilder.Set("platformVersion", user.PlatformVersion);
        if (!string.IsNullOrEmpty(user.DeviceModel))
            contextBuilder.Set("deviceModel", user.DeviceModel);

        // Add custom data
        if (user.CustomData != null)
        {
            foreach (var kvp in user.CustomData)
            {
                contextBuilder.Set(kvp.Key, new Value(kvp.Value));
            }
        }

        return contextBuilder.Build();
    }
}
