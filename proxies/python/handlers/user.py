from devcycle_python_sdk.models.user import DevCycleUser

from ..helpers.camelcase import camel_case_dict, snake_case_dict


def handle_user(body, data_store):
    user = DevCycleUser(**snake_case_dict(body))
    user_storage_id = str(len(data_store['users'].values()))
    data_store['users'][user_storage_id] = user

    user_dict = user.to_dict()

    camelcase_user = camel_case_dict(user_dict)

    camelcase_user['user_id'] = camelcase_user['userId']
    del camelcase_user['userId']

    return {
        "entityType": "User",
        "data": camelcase_user
    }, 201, {"Location": "user/" + user_storage_id}
