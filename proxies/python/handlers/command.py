import logging
from re import sub

from devcycle_python_sdk.models.event import DevCycleEvent
from devcycle_python_sdk.models.user import DevCycleUser

from ..helpers.camelcase import snake_case
from ..helpers.to_dict import to_dict

logger = logging.getLogger(__name__)

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

def parse_params(params:list, data_store, user:dict=None, event:dict=None):
    parsed_params = []
    for element in params:
        if element.get("location", None):
            entity = get_entity_from_location(element["location"], data_store)
            parsed_params.append(entity)
        elif element.get("callbackURL", None):
            parsed_params.append(element["callbackURL"])
        elif element.get("type", None) == "user":
            sdk_user = DevCycleUser(**user)
            parsed_params.append(sdk_user)
        elif element.get("type", None) == "event":
            sdk_event = DevCycleEvent(**event)
            parsed_params.append(sdk_event)
        else:
            parsed_params.append(element["value"])
    return parsed_params

def invoke_command(subject, command, params):
    func = getattr(subject, command)
    return func(*params)


def handle_command(path, body, data_store):
    entity, command, params, is_async, user, event = [body.get(k, None) for k in ('entity', 'command', 'params', 'isAsync', 'user', 'event')]

    stored_entity = get_entity_from_location(path, data_store)
    parsed_params = parse_params(params if params else [], data_store, user=user, event=event)

    if not stored_entity:
        logging.error('Invalid request: missing entity: %r', path)
        return {
            "message": "Invalid request: missing entity"
        }, 404

    if not command:
        logging.error('Invalid request: missing command')
        return {
            "message": "Invalid request: missing command"
        }, 400

    command = snake_case(command).replace('\r\n', '').replace('\n', '')
    sanitized_params = [str(param).replace('\r\n', '').replace('\n', '') for param in parsed_params]

    logger.info("[COMMAND] " + command + " " + str(sanitized_params))

    result = invoke_command(stored_entity, command, parsed_params)

    if not data_store['commandResults'].get(command, None):
        data_store["commandResults"][command] = {}

    command_id = str(len(data_store['commandResults'][command]))

    data_store['commandResults'][command][command_id] = result

    result_data, entity_type = to_dict(result)

    return {
        "entityType": entity_type,
        "data": result_data,
        "logs": []
    }, 201, {
        "Location": "command/" + command + "/" + command_id
    }

