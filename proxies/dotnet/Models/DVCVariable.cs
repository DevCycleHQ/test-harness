using DevCycle.SDK.Server.Common.Model;
using OpenFeature.Model;

namespace dotnet.Models;
public class DVCVariable<T>
{
    public string Key;
    public T Value;
    public T DefaultValue;
    public bool IsDefaulted;
    public TypeEnum Type;
    public string? Reason;
    public Dictionary<string, object>? FlagMetadata;

    public static DVCVariable<T> FromFlagEvaluationDetails<T>(FlagEvaluationDetails<T> variable, T defaultValue)
    {
        var serializableMetadata = new Dictionary<string, object>();
        var evalReasonDetails = variable.FlagMetadata?.GetString("evalReasonDetails");
        var evalReasonTargetId = variable.FlagMetadata?.GetString("evalReasonTargetId");

        if (!string.IsNullOrEmpty(evalReasonDetails))
            serializableMetadata["evalReasonDetails"] = evalReasonDetails;
        if (!string.IsNullOrEmpty(evalReasonTargetId))
            serializableMetadata["evalReasonTargetId"] = evalReasonTargetId;

        return new DVCVariable<T>
        {
            Key = variable.FlagKey,
            Value = variable.Value,
            DefaultValue = defaultValue,
            IsDefaulted = variable.Reason == OpenFeature.Constant.Reason.Default,
            Type = Variable<T>.DetermineType(variable.Value),
            FlagMetadata = serializableMetadata
        };
    }
}
