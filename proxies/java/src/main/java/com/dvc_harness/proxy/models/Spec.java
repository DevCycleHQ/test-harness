package com.dvc_harness.proxy.models;

public class Spec {
    private final String name;
    private final String version;
    private final String[] capabilities;

    public Spec() {
        name = "java";
        capabilities = new String[]{"LocalBucketing", "CloudBucketing", "EdgeDB"};
        version = "";
    }

    public String getName() {
        return name;
    }

    public String[] getCapabilities() {
        return capabilities;
    }

    public String getVersion() {
        return version;
    }
}
