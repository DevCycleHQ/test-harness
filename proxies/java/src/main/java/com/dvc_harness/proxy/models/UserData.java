package com.dvc_harness.proxy.models;

import com.devcycle.sdk.server.common.model.DevCycleUser;

public class UserData extends BaseResponse {
    private final String entityType;
    private final DevCycleUser data;

    public UserData(DevCycleUser user) {
        this.data = user;
        this.entityType = "user";
    }

    public String getEntityType() {
        return this.entityType;
    }

    public DevCycleUser getData() {
        return this.data;
    }
}
