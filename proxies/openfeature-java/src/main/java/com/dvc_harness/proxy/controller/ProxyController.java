package com.dvc_harness.proxy.controller;

import com.devcycle.sdk.server.cloud.api.DevCycleCloudClient;
import com.devcycle.sdk.server.cloud.model.DevCycleCloudOptions;
import com.devcycle.sdk.server.local.api.DevCycleLocalClient;
import com.devcycle.sdk.server.local.model.DevCycleLocalOptions;
import com.devcycle.sdk.server.common.model.DevCycleUser;
import com.devcycle.sdk.server.common.model.DevCycleEvent;
import com.dvc_harness.proxy.data.DataStore;
import com.dvc_harness.proxy.models.*;

// OpenFeature imports removed since we're using DevCycle SDK directly

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.util.Arrays;
import java.util.Map;
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
            if (body.clientId == null) {
                response.setStatus(400);
                return new MessageResponse("Invalid request: missing clientId");
            }

            Exception asyncError = null;
            DataStore.DataStoreClient dataStoreClient;

            try {
                if (body.enableCloudBucketing != null && body.enableCloudBucketing) {
                    DevCycleCloudOptions.DevCycleCloudOptionsBuilder builder = DevCycleCloudOptions.builder();
                    if (body.options != null) {
                        builder.enableEdgeDB(body.options.enableEdgeDB);
                        builder.baseURLOverride(body.options.bucketingAPIURI);
                    }

                    DevCycleCloudClient dvcClient = new DevCycleCloudClient(body.sdkKey, builder.build());
                    
                    // For now, we'll store the DevCycle client directly since there's no official OpenFeature provider
                    dataStoreClient = new DataStore.DataStoreClient(dvcClient, null);
                    
                } else {
                    DevCycleLocalOptions.DevCycleLocalOptionsBuilder builder = DevCycleLocalOptions.builder();
                    builder.disableRealtimeUpdates(true);

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

                    DevCycleLocalClient dvcClient = new DevCycleLocalClient(body.sdkKey, builder.build());

                    if (body.waitForInitialization != null && body.waitForInitialization) {
                        try {
                            long startWaitMS = System.currentTimeMillis();
                            long timeoutMS = 2000;
                            while (!dvcClient.isInitialized()) {
                                if (System.currentTimeMillis() - startWaitMS > timeoutMS) {
                                    System.out.println("Client initialization timed out after " + timeoutMS + "ms.");
                                    break;
                                }
                                Thread.sleep(50);
                            }
                        } catch (InterruptedException ie) {
                            // no-op
                        }
                    }

                    // For now, we'll store the DevCycle client directly since there's no official OpenFeature provider
                    dataStoreClient = new DataStore.DataStoreClient(dvcClient, null);
                }

                if (asyncError != null) {
                    response.setStatus(200);
                    return new ExceptionResponse(asyncError);
                } else {
                    DataStore.Clients.put(body.clientId, dataStoreClient);
                    response.setStatus(201);
                    response.addHeader("Location", "client/" + body.clientId);
                    return new MessageResponse("success");
                }

            } catch (Exception e) {
                response.setStatus(200);
                return new ExceptionResponse(e);
            }

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

        logger.info("[COMMAND] " + body.command + (parsedParams.length > 0 ? ": " + Arrays.toString(parsedParams) : ""));
        
        try {
            Object entity = getEntityFromLocation(request.getRequestURI());

            if (entity == null) {
                response.setStatus(404);
                return new MessageResponse("Invalid request: missing entity");
            }

            String command = body.command;
            Object result = invokeCommand(entity, command, parsedParams);
            
            EntityTypes entityType = getEntityFromType(result);
            
            String commandId = Integer.toString(
                DataStore.CommandResults.computeIfAbsent(command, k -> new java.util.Hashtable<>()).size()
            );
            
            DataStore.CommandResults.get(command).put(commandId, result);

            response.setStatus(201);
            response.addHeader("Location", "command/" + command + "/" + commandId);
            return new LocationResponse(
                entityType.name(),
                entityType.equals(EntityTypes.Client) ? new Object() : result
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
            String clientId = urlParts[1];
            return DataStore.Clients.get(clientId);
        }
        return null;
    }

    private Object[] parseParams(LocationRequestBody body) {
        Object[] parsedParams = new Object[body.params.length];
        for (int i = 0; i < body.params.length; i++) {
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

    private EntityTypes getEntityFromType(Object result) {
        if (result == null) {
            return EntityTypes.Void;
        }
        
        String className = result.getClass().getSimpleName();
        switch (className) {
            case "DevCycleUser":
                return EntityTypes.User;
            case "DVCVariable":
                return EntityTypes.Variable;
            case "DevCycleFeature":
                return EntityTypes.Feature;
            case "DataStoreClient":
                return EntityTypes.Client;
            default:
                return EntityTypes.Object;
        }
    }

    private Object invokeCommand(Object entity, String command, Object[] params) throws Exception {
        logger.info("invoking command \"" + command + "\" on \"" + entity.getClass().getSimpleName() + "\" with params " + Arrays.toString(params));
        
        DataStore.DataStoreClient dataStoreClient = (DataStore.DataStoreClient) entity;
        
        if (command.equals("variable")) {
            return getDevCycleVariable(dataStoreClient, params);
        } else if (command.equals("variableValue")) {
            return getDevCycleVariableValue(dataStoreClient, params);
        }

        // Fall back to DevCycle client method invocation
        Object dvcClient = dataStoreClient.getDvcClient();
        return java.lang.reflect.Method.class.cast(
            dvcClient.getClass().getMethod(command, 
                Arrays.stream(params).map(Object::getClass).toArray(Class[]::new))
        ).invoke(dvcClient, params);
    }

    private DVCVariable getDevCycleVariable(DataStore.DataStoreClient dataStoreClient, Object[] params) {
        DevCycleUser user = (DevCycleUser) params[0];
        String key = (String) params[1];
        Object defaultValue = params[2];
        String type = (String) params[3];

        try {
            // Use DevCycle SDK directly to get variable
            Object dvcClient = dataStoreClient.getDvcClient();
            Object variable;
            
            if (dvcClient instanceof com.devcycle.sdk.server.cloud.api.DevCycleCloudClient) {
                variable = ((com.devcycle.sdk.server.cloud.api.DevCycleCloudClient) dvcClient).variable(user, key, defaultValue);
            } else {
                variable = ((com.devcycle.sdk.server.local.api.DevCycleLocalClient) dvcClient).variable(user, key, defaultValue);
            }
            
            // Use reflection to get values since we don't know the exact type
            try {
                String varKey = (String) variable.getClass().getMethod("getKey").invoke(variable);
                Object varValue = variable.getClass().getMethod("getValue").invoke(variable);
                Object varDefaultValue = variable.getClass().getMethod("getDefaultValue").invoke(variable);
                Boolean isDefaulted = (Boolean) variable.getClass().getMethod("getIsDefaulted").invoke(variable);
                Object varType = variable.getClass().getMethod("getType").invoke(variable);
                
                return new DVCVariable(
                    varKey,
                    varValue,
                    varDefaultValue,
                    isDefaulted,
                    varType.toString(),
                    isDefaulted ? "DEFAULT" : "TARGETING_MATCH",
                    new java.util.HashMap<>()
                );
            } catch (Exception reflectionError) {
                logger.log(Level.WARNING, "Error accessing variable properties: " + reflectionError.getMessage());
                throw new RuntimeException(reflectionError);
            }
        } catch (Exception e) {
            logger.log(Level.WARNING, "Error evaluating DevCycle variable: " + e.getMessage());
            throw new RuntimeException(e);
        }
    }

    private Object getDevCycleVariableValue(DataStore.DataStoreClient dataStoreClient, Object[] params) {
        DevCycleUser user = (DevCycleUser) params[0];
        String key = (String) params[1];
        Object defaultValue = params[2];
        String type = (String) params[3];

        try {
            // Use DevCycle SDK directly to get variable value
            Object dvcClient = dataStoreClient.getDvcClient();
            Object variable;
            
            if (dvcClient instanceof com.devcycle.sdk.server.cloud.api.DevCycleCloudClient) {
                variable = ((com.devcycle.sdk.server.cloud.api.DevCycleCloudClient) dvcClient).variable(user, key, defaultValue);
            } else {
                variable = ((com.devcycle.sdk.server.local.api.DevCycleLocalClient) dvcClient).variable(user, key, defaultValue);
            }
            
            // Use reflection to get value since we don't know the exact type
            try {
                return variable.getClass().getMethod("getValue").invoke(variable);
            } catch (Exception reflectionError) {
                logger.log(Level.WARNING, "Error accessing variable value: " + reflectionError.getMessage());
                throw new RuntimeException(reflectionError);
            }
        } catch (Exception e) {
            logger.log(Level.WARNING, "Error evaluating DevCycle variable value: " + e.getMessage());
            throw new RuntimeException(e);
        }
    }

    // Method removed since we're using DevCycle SDK directly instead of OpenFeature

    private String getVariableType(Object value) {
        if (value == null) return "object";
        if (value instanceof Boolean) return "boolean";
        if (value instanceof Integer || value instanceof Double || value instanceof Number) return "number";
        if (value instanceof String) return "string";
        return "JSON";
    }

    private String capitalize(String str) {
        if (str == null || str.isEmpty()) return str;
        return str.substring(0, 1).toUpperCase() + str.substring(1);
    }
}