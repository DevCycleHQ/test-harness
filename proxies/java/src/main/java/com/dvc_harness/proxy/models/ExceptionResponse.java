package com.dvc_harness.proxy.models;

public class ExceptionResponse extends BaseResponse {
    public final String exception;
    public StackTraceElement[] stack;

    public ExceptionResponse(Exception error) {
        this.exception = error.toString();
        this.stack = error.getStackTrace();
    }
}
