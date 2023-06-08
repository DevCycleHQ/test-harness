from devcycle_python_sdk import Configuration, DVCClient, DVCOptions

def handle_client(body, data_store):
    client_id, sdk_key, options = [body.get(k, None) for k in ('clientId', 'sdkKey', 'options')]

    options = options if options else {}

    if (client_id == None):
        error = {
            "message": "Invalid request: missing clientId"
        }

        return error, 400

    configuration = Configuration()
    configuration.api_key['Authorization'] = sdk_key

    # TODO remove this when SDK properly supports passing in this property
    base_url = options.get('baseURLOverride', None)
    if base_url:
        configuration.host = options['baseURLOverride']
        del options['baseURLOverride']

    # TODO remove this when the option is supported by the SDK
    if 'enableCloudBucketing' in options:
        del options['enableCloudBucketing']

    dvc_options = DVCOptions(**options)

    dvc_client = DVCClient(configuration, dvc_options)

    data_store['clients'][client_id] = dvc_client

    success = {
        "message": "success"
    }

    return success, 201, {"Location": 'client/' + client_id}