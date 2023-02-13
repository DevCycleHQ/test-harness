package com.dvc_harness.proxy.models;

public class ExceptionResponse extends BaseResponse {
    public final String exception;
    public final String asyncError;
    public StackTraceElement[] stack;

    public ExceptionResponse(Exception error) {
        this.exception = error.toString();
        this.asyncError = error.toString();
        this.stack = error.getStackTrace();
    }
}
