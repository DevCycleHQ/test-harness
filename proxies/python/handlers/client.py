from devcycle_python_sdk import DevCycleCloudClient, DevCycleCloudOptions

def handle_client(body, data_store):
    client_id, sdk_key, enableCloudBucketing, waitForInitialization, options = [body.get(k, None) for k in ('clientId', 'sdkKey', 'enableCloudBucketing', 'waitForInitialization', 'options')]

    options = options if options else {}

    if (client_id == None):
        error = {
            "message": "Invalid request: missing clientId"
        }

        return error, 400

    if enableCloudBucketing:
        dvc_options = DevCycleCloudOptions(
            enable_edge_db=options.get('enableEdgeDB', False),
            bucketing_api_uri=options.get('bucketingAPIURI', ''),
            config_cdn_uri=options.get('configCDNURI', ''),
            events_api_uri=options.get('eventsAPIURI', ''),
            retry_delay=1, # Override retry delay to make the tests run faster
        )
        dvc_client = DevCycleCloudClient(sdk_key, dvc_options)
    else:
        raise NotImplementedError("Only the Cloud Bucketing SDK is supported at this time")

    data_store['clients'][client_id] = dvc_client

    success = {
        "message": "success"
    }

    return success, 201, {"Location": 'client/' + client_id}