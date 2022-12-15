package com.dvc_harness.proxy.data;

import java.util.Hashtable;

import com.devcycle.sdk.server.cloud.api.DVCCloudClient;
import com.devcycle.sdk.server.local.api.DVCLocalClient;
import com.devcycle.sdk.server.common.model.*;

class DataStore {
    public static Hashtable<String, DVCLocalClient> LocalClients;
    public static Hashtable<String, DVCCloudClient> CloudClients;

    public static Hashtable<String, User> Users;
    public static Hashtable<String, Object> Commands;

    public static void DataStore()
    {
        CloudClients = new Hashtable<String, DVCCloudClient>();
        LocalClients = new Hashtable<String, DVCLocalClient>();
        Users = new Hashtable<String, User>();
        Commands = new Hashtable<String, Object>();
    }
}
