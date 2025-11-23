package com.dvc_harness.proxy.data;

import java.util.Hashtable;

import com.devcycle.sdk.server.cloud.api.DevCycleCloudClient;
import com.devcycle.sdk.server.local.api.DevCycleLocalClient;

public class DataStore {
    public static class DataStoreClient {
        public DevCycleCloudClient dvcCloudClient;
        public DevCycleLocalClient dvcLocalClient;
        
        public DataStoreClient(DevCycleCloudClient cloudClient, Object unused) {
            this.dvcCloudClient = cloudClient;
        }
        
        public DataStoreClient(DevCycleLocalClient localClient, Object unused) {
            this.dvcLocalClient = localClient;
        }
        
        public Object getDvcClient() {
            return dvcCloudClient != null ? dvcCloudClient : dvcLocalClient;
        }
    }
    
    public static Hashtable<String, DataStoreClient> Clients = new Hashtable<>();
    public static Hashtable<String, Hashtable<String, Object>> CommandResults = new Hashtable<>();
}