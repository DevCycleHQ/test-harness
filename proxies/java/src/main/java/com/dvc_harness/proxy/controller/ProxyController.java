package com.dvc_harness.proxy.controller;

import com.devcycle.sdk.server.cloud.model.DVCCloudOptions;
import com.devcycle.sdk.server.local.model.DVCLocalOptions;
import com.dvc_harness.proxy.data.DataStore;
import com.dvc_harness.proxy.models.*;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;


import com.devcycle.sdk.server.local.api.DVCLocalClient;
import com.devcycle.sdk.server.cloud.api.DVCCloudClient;
import com.devcycle.sdk.server.common.model.User;

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

    @PostMapping("/user")
    public BaseResponse user(@RequestBody UserRequestBody body, HttpServletResponse response) {
        try {
            User sdkUser = User.builder()
                .userId(body.user_id)
                .name(body.name)
                .language(body.language)
                .country(body.country)
                .appVersion(body.appVersion)
                .appBuild(body.appBuild)
                .customData(body.customData)
                .privateCustomData(body.privateCustomData)
                .createdDate(body.createdDate)
                .lastSeenDate(body.lastSeenDate)
                .build();

            var userId = Integer.toString(DataStore.Users.size());
            DataStore.Users.put(userId, sdkUser);

            var result = new UserData(sdkUser);
            response.setStatus(201);
            response.addHeader("Location", "user/" + userId);
            return result;
        } catch (Exception e) {
            response.setStatus(200);
            return new ExceptionResponse(e.getMessage());
        }
        
    }

    @PostMapping("/client")
    public BaseResponse client(@RequestBody ClientRequestBody body, HttpServletResponse response) {
        try {
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
        } catch (Exception e) {
            response.setStatus(200);
            return new ExceptionResponse(e.getMessage());
        }
    }
}
