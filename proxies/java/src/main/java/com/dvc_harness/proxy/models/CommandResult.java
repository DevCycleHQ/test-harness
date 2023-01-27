package com.dvc_harness.proxy.models;

import com.dvc_harness.proxy.data.DataStore;

import java.lang.reflect.InvocationTargetException;
import java.util.Hashtable;
import java.util.logging.Level;
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
    ) throws NoSuchMethodException, SecurityException, IllegalAccessException, InvocationTargetException {
        Class<?>[] paramTypes = new Class<?>[params.length];
        for (int i=0; i < params.length; i++) {
            paramTypes[i] = params[i].getClass();
        }

        // When getting methods with generic params, the param type should be an Object
        if (this.command.equals("variable")) paramTypes[2] = Object.class;

        this.body = this.entity
                .getClass()
                .getMethod(this.command, paramTypes)
                .invoke(this.entity, params);
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
            case "User":
                return EntityTypes.User;
            case "Variable":
                return EntityTypes.Variable;
            case "Feature":
                return EntityTypes.Feature;
            case "DVCLocalClient":
            case "DVCCloudClient":
                return EntityTypes.Client;
            default:
                return EntityTypes.Object;
        }
    }
}
