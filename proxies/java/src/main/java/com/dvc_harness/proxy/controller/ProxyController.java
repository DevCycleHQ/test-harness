package com.dvc_harness.proxy.controller;

import com.devcycle.sdk.server.cloud.model.DVCCloudOptions;
import com.devcycle.sdk.server.local.model.DVCLocalOptions;
import com.dvc_harness.proxy.data.DataStore;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.dvc_harness.proxy.models.ClientRequestBody;
import com.dvc_harness.proxy.models.MessageResponse;
import com.devcycle.sdk.server.local.api.DVCLocalClient;
import com.devcycle.sdk.server.cloud.api.DVCCloudClient;

@Controller
@RestController
public class ProxyController {

    @GetMapping("/healthz")
    public String index() {
        return "healthy";
    }

    @GetMapping("/spec")
    public Spec spec() {
        return new Spec();
    }

    @PostMapping("/client")
    public MessageResponse client(@RequestBody ClientRequestBody body, HttpServletResponse response) {
        if (body.enableCloudBucketing != null && body.enableCloudBucketing) {
            DVCCloudOptions.DVCCloudOptionsBuilder builder = DVCCloudOptions.builder();
            if (body.options != null) {
                builder.enableEdgeDB(body.options.enableEdgeDB);
            }

            DVCCloudClient client = new DVCCloudClient(body.sdkKey, builder.build());
            DataStore.CloudClients.put(body.clientId, client);
        } else {
            DVCLocalOptions.DVCLocalOptionsBuilder builder = DVCLocalOptions.builder();

            if (body.options != null) {
                if (body.options.baseURLOverride != null) {
                    builder.configCdnBaseUrl(body.options.baseURLOverride);
                    builder.eventsApiBaseUrl(body.options.baseURLOverride);
                }

                if (body.options.configPollingIntervalMS != null) {
                    builder.configPollingIntervalMs(body.options.configPollingIntervalMS);
                }

                if (body.options.eventFlushIntervalMS != null) {
                    builder.eventFlushIntervalMS(body.options.eventFlushIntervalMS);
                }
            }

            DVCLocalClient client = new DVCLocalClient(body.sdkKey, builder.build());

            DataStore.LocalClients.put(body.clientId, client);
        }

        response.addHeader("Location", "client/" + body.clientId);

        return new MessageResponse("success");
    }
}