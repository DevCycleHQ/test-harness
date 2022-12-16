from .entity_types import get_entity_from_type


# handle converting results into dictionaries which can then be serialized
# if array, recursively call on each entry
# if object, try to turn into dict. If result is now dict (or already was), try turning each value into a dict
# also return the entity type detected (Variable etc.)
def to_dict(result):
    if isinstance(result, list):
        result_data = [to_dict(r)[0] for r in result]
        entity_type = get_entity_from_type(result[0].__class__.__name__)
    else:
        result_data = result.to_dict() if hasattr(result, "to_dict") else result
        if isinstance(result_data, dict):
            result_data = {k: to_dict(v)[0] for k, v in result_data.items()}
        entity_type = get_entity_from_type(result.__class__.__name__)

    return result_data, entity_type
