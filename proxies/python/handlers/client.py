from devcycle_python_sdk import Configuration, DVCClient, DVCOptions

def handle_client(body, data_store):
    client_id, sdk_key, options = [body.get(k, None) for k in ('clientId', 'sdkKey', 'options')]

    if (client_id == None):
        error = {
            "errorMessage": "Invalid request: missing clientId"
        }

        return error, 400

    configuration = Configuration()
    configuration.api_key['Authorization'] = sdk_key

    options = DVCOptions(**(options or {}))

    dvc_client = DVCClient(configuration, options)

    data_store['clients'][client_id] = dvc_client

    success = {
        "message": "success"
    }

    return success, 201, {"Location": 'client/' + client_id}