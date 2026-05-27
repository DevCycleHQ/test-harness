package com.dvc_harness.proxy.models;

import java.util.List;

public class LocationResponse extends BaseResponse {
    private final String entityType;
    private final Object data;
    private final List<String> logs;

    public LocationResponse(String entityType, Object data) {
        this.entityType = entityType;
        this.data = data;
        this.logs = List.of(); // TODO add logs
    }

    public String getEntityType() {
        return entityType;
    }

    public Object getData() {
        return data;
    }

    public List<String> getLogs() {
        return logs;
    }
}