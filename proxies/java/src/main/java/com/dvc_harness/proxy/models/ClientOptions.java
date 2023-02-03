package com.dvc_harness.proxy.models;

public class ClientOptions {
    public Boolean enableEdgeDB;
    
    public String bucketingAPIURI;
    public String eventsAPIURI;
    public String configCDNURI;

    public Integer eventFlushIntervalMS;

    public Integer configPollingIntervalMS;
}
