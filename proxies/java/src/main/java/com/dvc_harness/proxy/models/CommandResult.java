package com.dvc_harness.proxy.models;

import com.dvc_harness.proxy.data.DataStore;
import java.lang.reflect.Method;
import java.util.Hashtable;
import java.util.logging.Logger;

public class CommandResult<T> {
    private Logger logger = Logger.getLogger(this.getClass().getName());
    T entity;
    String command;
    public Object body;
    public Integer commandId;
    public EntityTypes entityType;


    public CommandResult(T entity, String command) {
        this.entity = entity;
        this.command = command;
    }

    public CommandResult invokeCommand(
        Object[] params
    ) throws NoSuchMethodException, Exception {
        Method[] allEntityMethods = this.entity.getClass().getMethods();
        Method methodToExecute = null;
        for(int i = 0; i < allEntityMethods.length; i++) {
            if (allEntityMethods[i].getName().equals(this.command)) {
                methodToExecute = allEntityMethods[i];
            }
        }

        if (methodToExecute == null) {
            throw new NoSuchMethodException();
        }
        try {
            this.body = methodToExecute.invoke(this.entity, params);
        } catch (Throwable t) {
            throw new Exception(t.getCause().getMessage());
        }
        this.parseResult(this.body);
        return this;
    }

    private void parseResult(Object result) {
        String entityClassName = result != null ? result.getClass().getSimpleName() : null;
        EntityTypes entityType = entityClassName != null
            ? this.getEntityFromType(entityClassName)
            : EntityTypes.Void;

        Hashtable existingCommandResults = DataStore.CommandResults.get(command);
        Integer commandId = existingCommandResults != null ? existingCommandResults.size() : 0;

        if (existingCommandResults == null) {
            DataStore.CommandResults.put(command, new Hashtable<>());
        }
        if (result != null) DataStore.CommandResults.get(command).put(commandId, result);

        this.commandId = commandId;
        this.entityType = entityType;
    }

    private EntityTypes getEntityFromType(String value) {
        switch (value) {
            case "DevCycleUser":
                return EntityTypes.User;
            case "Variable":
                return EntityTypes.Variable;
            case "Feature":
                return EntityTypes.Feature;
            case "DevCycleLocalClient":
            case "DevCycleCloudClient":
                return EntityTypes.Client;
            default:
                return EntityTypes.Object;
        }
    }
}
