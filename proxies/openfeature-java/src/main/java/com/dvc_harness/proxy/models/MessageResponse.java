package com.dvc_harness.proxy.models;

public class MessageResponse extends BaseResponse {
    private final String message;

    public MessageResponse(String message) {
        this.message = message;
    }

    public String getMessage() {
        return message;
    }
}