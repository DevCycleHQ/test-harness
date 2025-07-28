package com.dvc_harness.proxy.models;

public class DVCVariable {
    private final String key;
    private final Object value;
    private final Object defaultValue;
    private final boolean isDefaulted;
    private final String type;
    private final String reason;
    private final java.util.Map<String, Object> flagMetadata;

    public DVCVariable(String key, Object value, Object defaultValue, boolean isDefaulted, 
                       String type, String reason, java.util.Map<String, Object> flagMetadata) {
        this.key = key;
        this.value = value;
        this.defaultValue = defaultValue;
        this.isDefaulted = isDefaulted;
        this.type = type;
        this.reason = reason;
        this.flagMetadata = flagMetadata;
    }

    public String getKey() {
        return key;
    }

    public Object getValue() {
        return value;
    }

    public Object getDefaultValue() {
        return defaultValue;
    }

    public boolean isDefaulted() {
        return isDefaulted;
    }

    public String getType() {
        return type;
    }

    public String getReason() {
        return reason;
    }

    public java.util.Map<String, Object> getFlagMetadata() {
        return flagMetadata;
    }
}