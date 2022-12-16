package com.dvc_harness.proxy.models;

public class ExceptionResponse extends BaseResponse {
    public final String exception;

    public ExceptionResponse(String message) {
        this.exception = message;
    }
}
