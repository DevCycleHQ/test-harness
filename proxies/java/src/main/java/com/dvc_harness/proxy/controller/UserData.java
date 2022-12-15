package com.dvc_harness.proxy.controller;

import com.devcycle.sdk.server.common.model.User;
public class UserData {
    private final String name;
    private final String version;
    private final String[] capabilities;

    public UserData(ClientRequestUser user, ) {
        var sdkUser = new User(
                user.UserId, 
                user.Email,
                user.Name,
                user.Language,
                user.Country,
                user.AppVersion,
                user.AppBuild,
                user.CustomData,
                user.PrivateCustomData,
                user.CreatedDate,
                user.LastSeenDate,
                user.Platform,
                user.PlatformVersion,
                user.DeviceModel,
                user.SdkType,
                user.SdkVersion
            );
        var userId = DataStore.Users.Count;
        DataStore.Users[userId.ToString()] = sdkUser;

        var result = new {entityType = "user", body = sdkUser};

        Response.Headers.Add("Location", "user/" + userId);
        Response.StatusCode = (int)HttpStatusCode.Created;
        return result;
    }

    public String getName() {
        return name;
    }

    public String[] getCapabilities() {
        return capabilities;
    }

    public String getVersion() {
        return version;
    }
}
