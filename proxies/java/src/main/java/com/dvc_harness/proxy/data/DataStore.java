package com.dvc_harness.proxy.data;

import java.util.Hashtable;

import com.devcycle.sdk.server.cloud.api.DevCycleCloudClient;
import com.devcycle.sdk.server.local.api.DevCycleLocalClient;
import com.devcycle.sdk.server.common.model.*;

public class DataStore {
    public static Hashtable<String, DevCycleLocalClient> LocalClients = new Hashtable();
    public static Hashtable<String, DevCycleCloudClient> CloudClients = new Hashtable();

    public static Hashtable<String, Hashtable> CommandResults = new Hashtable();
}
