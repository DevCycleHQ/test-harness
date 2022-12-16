package com.dvc_harness.proxy.models;

public class AsyncErrorResponse extends BaseResponse {
    public final String asyncError;

    public AsyncErrorResponse(String message) {
        this.asyncError = message;
    }
}
