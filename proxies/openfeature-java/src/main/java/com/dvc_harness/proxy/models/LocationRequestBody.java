package com.dvc_harness.proxy.models;

import com.devcycle.sdk.server.common.model.DevCycleUser;
import com.devcycle.sdk.server.common.model.DevCycleEvent;

public class LocationRequestBody {
    public String command;
    public LocationParam[] params;
    public DevCycleUser user;
    public DevCycleEvent event;
    public boolean isAsync;
}