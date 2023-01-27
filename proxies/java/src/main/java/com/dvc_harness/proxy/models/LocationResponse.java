package com.dvc_harness.proxy.models;

public class LocationResponse extends BaseResponse {
    public final String entityType;
    public final Object data;

    public LocationResponse(String entityType, Object data) {
        this.entityType = entityType;
        this.data = data;
    }
}
