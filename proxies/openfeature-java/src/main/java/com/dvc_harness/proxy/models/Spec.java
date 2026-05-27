package com.dvc_harness.proxy.models;

public class Spec {
    private final String name;
    private final String version;
    private final String[] capabilities;

    public Spec() {
        name = "OpenFeature-Java-Provider";
        capabilities = new String[]{"EdgeDB", "LocalBucketing"};
        version = ""; // TODO add branch name or sdk version here
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