package com.dvc_harness.proxy.models;

import com.devcycle.sdk.server.common.model.User;
import com.devcycle.sdk.server.common.model.Event;

public class LocationRequestBody {
    public String command;
    public LocationParam[] params;
    public User user;
    public Event event;
    public boolean isAsync;
}
