ENTITY_TYPES = {
    "user": "User",
    "variable": "Variable",
    "feature": "Feature",
    "object": "Object"
}


def get_entity_from_type(entity_type):
    match entity_type:
        case "UserData":
            return ENTITY_TYPES["user"]
        case "Variable":
            return ENTITY_TYPES["variable"]
        case _:
            return ENTITY_TYPES["object"]
