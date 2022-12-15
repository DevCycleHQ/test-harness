package com.dvc_harness.proxy.data;

import java.util.Hashtable;

import com.devcycle.sdk.server.cloud.api.DVCCloudClient;
import com.devcycle.sdk.server.local.api.DVCLocalClient;
import com.devcycle.sdk.server.common.model.*;

public class DataStore {
    public static Hashtable<String, DVCLocalClient> LocalClients = new Hashtable<>();
    public static Hashtable<String, DVCCloudClient> CloudClients = new Hashtable<>();

    public static Hashtable<String, User> Users = new Hashtable<>();
    public static Hashtable<String, Object> Commands = new Hashtable<>();
}
