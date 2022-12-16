package com.dvc_harness.proxy.models;

public class MessageResponse extends BaseResponse {
    public final String message;

    public MessageResponse(String message) {
        this.message = message;
    }
}
