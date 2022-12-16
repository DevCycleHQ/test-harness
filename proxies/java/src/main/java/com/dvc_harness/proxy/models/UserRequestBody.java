package com.dvc_harness.proxy.models;

public class UserRequestBody {
    public String user_id;
    public String name;
    public String language;
    public String country;
    public String appVersion;
    public String appBuild;
    public Object customData;
    public Object privateCustomData;
    public Long createdDate;
    public Long lastSeenDate;
}