package com.dvc_harness.proxy.controller;

import com.devcycle.sdk.server.cloud.api.DevCycleCloudClient;
import com.devcycle.sdk.server.cloud.model.DevCycleCloudOptions;
import com.devcycle.sdk.server.local.api.DevCycleLocalClient;
import com.devcycle.sdk.server.local.model.DevCycleLocalOptions;
import com.dvc_harness.proxy.data.DataStore;
import com.dvc_harness.proxy.models.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.util.Arrays;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;


@Controller
@RestController
public class ProxyController {
    private Logger logger = Logger.getLogger(this.getClass().getName());

    @GetMapping("/healthz")
    public String index() {
        return "healthy";
    }

    @GetMapping("/spec")
    public Spec spec() {
        return new Spec();
    }

    @PostMapping("/client")
    public BaseResponse client(@RequestBody ClientRequestBody body, HttpServletResponse response) {
        try {
            if (body.enableCloudBucketing != null && body.enableCloudBucketing) {
                DevCycleCloudOptions.DevCycleCloudOptionsBuilder builder = DevCycleCloudOptions.builder();
                if (body.options != null) {
                    builder.enableEdgeDB(body.options.enableEdgeDB);
                    builder.baseURLOverride(body.options.bucketingAPIURI);
                }

                DevCycleCloudClient client = new DevCycleCloudClient(body.sdkKey, builder.build());
                DataStore.CloudClients.put(body.clientId, client);
            } else {
                DevCycleLocalOptions.DevCycleLocalOptionsBuilder builder = DevCycleLocalOptions.builder();
                builder.setDisableRealtimeUpdates(true);

                if (body.options != null) {
                    if (body.options.configCDNURI != null) {
                        builder.configCdnBaseUrl(body.options.configCDNURI);
                    }

                    if (body.options.eventsAPIURI != null) {
                        builder.eventsApiBaseUrl(body.options.eventsAPIURI);
                    }

                    if (body.options.configPollingIntervalMS != null) {
                        builder.configPollingIntervalMs(body.options.configPollingIntervalMS);
                    }

                    if (body.options.eventFlushIntervalMS != null) {
                        builder.eventFlushIntervalMS(body.options.eventFlushIntervalMS);
                    }
                }

                DevCycleLocalClient client = new DevCycleLocalClient(body.sdkKey, builder.build());

                if(body.waitForInitialization) {
                    try {
                        long startWaitMS = System.currentTimeMillis();
                        while (!client.isInitialized()) {
                            if (System.currentTimeMillis() - startWaitMS > 2000) {
                                System.out.println("Client initialization timed out after 2000ms.");
                                break;
                            }
                            Thread.sleep(50);
                        }
                    } catch (InterruptedException ie) {
                        // no-op
                    }
                }
                DataStore.LocalClients.put(body.clientId, client);
            }

            response.addHeader("Location", "client/" + body.clientId);

            return new MessageResponse("success");
        } catch (Exception e) {
            response.setStatus(200);
            return new ExceptionResponse(e);
        }
    }

    @PostMapping("/*/*")
    public BaseResponse location(
        HttpServletRequest request,
        @RequestBody LocationRequestBody body,
        HttpServletResponse response
    ) {
        if (body.command == null) {
            response.setStatus(404);
            return new MessageResponse("Invalid request: missing command");
        }

        if (body.params == null) {
            response.setStatus(404);
            return new MessageResponse("Invalid request: missing params");
        }

        Object[] parsedParams = this.parseParams(body);


        logger.info("[COMMAND] " + body.command + (parsedParams.length > 0 ? ": " + Arrays.toString(Arrays.stream(parsedParams).toArray()) : ""));
        try {
            Object entity = getEntityFromLocation(request.getRequestURI());

            if (entity == null) {
                response.setStatus(404);
                return new MessageResponse("Invalid request: missing entity");
            }

            String command = body.command;
            CommandResult result = new CommandResult(entity, command).invokeCommand(parsedParams);

            response.setStatus(201);
            response.addHeader("Location", "command/" + command + "/" + result.commandId);
            return new LocationResponse(
                    result.entityType.name(),
                    result.entityType.equals(EntityTypes.Client) ? new Object() : result.body
            );
        } catch (Exception e) {
            logger.log(Level.INFO, "[COMMAND ERROR] " + body.command + ": " + e.getMessage());
            e.printStackTrace();
            return body.isAsync ? new AsyncErrorResponse(e) : new ExceptionResponse(e);
        }
    }

    private Object getEntityFromLocation(String uri) {
        String[] urlParts = uri.substring(1).split("/");
        String locationType = urlParts[0];

        if (locationType.equals("command")) {
            String entityType = urlParts[1];
            String commandId = urlParts[2];
            return DataStore.CommandResults.get(entityType).get(commandId);
        }
        if (locationType.equals("client")) {

            Object clientEntity;
            String clientId = urlParts[1];
            if ((clientEntity = DataStore.LocalClients.get(clientId)) != null) return clientEntity;
            if ((clientEntity = DataStore.CloudClients.get(clientId)) != null) return clientEntity;
        }
        return null;
    }

    private Object[] parseParams(LocationRequestBody body) {
        Object[] parsedParams = new Object[body.params.length];
        for (int i=0; i < body.params.length; i++) {
            LocationParam element = body.params[i];
            if (element.callbackURL != null) {
                parsedParams[i] = element.callbackURL;
            } else if (element.type != null && element.type.equals(LocationParamType.user)) {
                parsedParams[i] = body.user;
            } else if (element.type != null && element.type.equals(LocationParamType.event)) {
                parsedParams[i] = body.event;
            } else {
                parsedParams[i] = element.value;
            }
        }
        return parsedParams;
    }
}
