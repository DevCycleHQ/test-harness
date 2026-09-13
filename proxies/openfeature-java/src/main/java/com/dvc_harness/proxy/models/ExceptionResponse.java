package com.dvc_harness.proxy.models;

public class ExceptionResponse extends BaseResponse {
    private final String exception;
    private final String stack;

    public ExceptionResponse(Exception e) {
        this.exception = e.getMessage();
        this.stack = java.util.Arrays.toString(e.getStackTrace());
    }

    public String getException() {
        return exception;
    }

    public String getStack() {
        return stack;
    }
}