package com.dvc_harness.proxy.models;

public class AsyncErrorResponse extends BaseResponse {
    public final String asyncError;
    public StackTraceElement[] stack;

    public AsyncErrorResponse(Exception error) {
        this.asyncError = error.toString();
        this.stack = error.getStackTrace();
    }
}
