from re import sub
from ..helpers.entity_types import get_entity_from_type
from ..helpers.camelcase import camel_case_dict

def get_entity_from_location(location, data_store):
    url_parts = sub(r"^/", '', location).split('/')
    location_type, *location_path = url_parts

    if location_type == 'command':
        entity_type, command_id = location_path
        return data_store["commandResults"].get(entity_type, {}).get(command_id, None)
    elif location_type == 'client':
        client_id, = location_path
        return data_store["clients"].get(client_id, None)
    elif location_type == 'user':
        user_id, = location_path
        return data_store["users"].get(user_id, None)

    return None

def parse_params(params, data_store):
    parsed_params = []
    for element in params:
        if element.get("location", None):
            entity = get_entity_from_location(element["location"], data_store)
            parsed_params.append(entity)
        elif element.get("callbackURL", None):
            parsed_params.append(element["callbackURL"])
        else:
            parsed_params.append(element["value"])
    return parsed_params

def invoke_command(subject, command, params):
    func = getattr(subject, command)
    return func(*params)


def handle_command(path, body, data_store):
    entity, command, params, is_async = [body.get(k, None) for k in ('entity', 'command', 'params', 'isAsync')]

    stored_entity = get_entity_from_location(path, data_store)
    parsed_params = parse_params(params if params else [], data_store)

    if not stored_entity:
        return {
            "errorMessage": "Invalid request: missing entity"
        }, 404

    if None in parsed_params:
        return {
            "errorMessage": "Invalid request: missing entity from param"
        }, 404

    if not command:
        return {
            "errorMessage": "Invalid request: missing command"
        }, 400

    result = invoke_command(stored_entity, command, parsed_params)

    entity_type = get_entity_from_type(result.__class__.__name__)

    if not data_store['commandResults'].get(command, None):
        data_store["commandResults"][command] = {}

    command_id = str(len(data_store['commandResults'][command]))

    data_store['commandResults'][command][command_id] = result

    result_data = result.to_dict() if hasattr(result, "to_dict") else result

    return {
        "entityType": entity_type,
        "data": camel_case_dict(result_data),
        "logs": []
    }, 200, {
        "Location": "command/" + command + "/" + command_id
    }

