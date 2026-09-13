package com.dvc_harness.proxy.models;

public class AsyncErrorResponse extends BaseResponse {
    private final String asyncError;
    private final String stack;

    public AsyncErrorResponse(Exception e) {
        this.asyncError = e.getMessage();
        this.stack = java.util.Arrays.toString(e.getStackTrace());
    }

    public String getAsyncError() {
        return asyncError;
    }

    public String getStack() {
        return stack;
    }
}