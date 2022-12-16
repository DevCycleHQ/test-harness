package com.dvc_harness.proxy.controller;

import com.devcycle.sdk.server.common.model.User;
public class UserData {
    private final String entityType;
    private final User data;

    public UserData(User user) {
        data = user;
        entityType = "user";
    }

    public String getEntityType() {
        return entityType;
    }

    public User getData() {
        return data;
    }
}
