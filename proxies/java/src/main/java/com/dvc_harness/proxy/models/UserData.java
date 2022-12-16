package com.dvc_harness.proxy.models;

import com.devcycle.sdk.server.common.model.User;

public class UserData extends BaseResponse {
    private final String entityType;
    private final User data;

    public UserData(User user) {
        this.data = user;
        this.entityType = "user";
    }

    public String getEntityType() {
        return this.entityType;
    }

    public User getData() {
        return this.data;
    }
}
