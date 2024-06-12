import logging
import time

from devcycle_python_sdk import DevCycleCloudClient, DevCycleCloudOptions, DevCycleLocalClient, DevCycleLocalOptions

logger = logging.getLogger(__name__)


def handle_client(body, data_store):
    client_id, sdk_key, enableCloudBucketing, waitForInitialization, options = [body.get(k, None) for k in (
    'clientId', 'sdkKey', 'enableCloudBucketing', 'waitForInitialization', 'options')]

    options = options if options else {}

    if client_id is None:
        error = {
            "message": "Invalid request: missing clientId"
        }

        return error, 400

    if enableCloudBucketing:
        dvc_options = DevCycleCloudOptions(
            enable_edge_db=options.get('enableEdgeDB', False),
            bucketing_api_uri=options.get('bucketingAPIURI', ''),
            retry_delay=1,  # Override retry delay to make the tests run faster
        )
        dvc_client = DevCycleCloudClient(sdk_key, dvc_options)
    else:
        dvc_options = DevCycleLocalOptions(
            config_cdn_uri=options.get('configCDNURI', ''),
            config_polling_interval_ms=options.get('configPollingIntervalMS', 1000),
            events_api_uri=options.get('eventsAPIURI', ''),
            event_flush_interval_ms=options.get('eventFlushIntervalMS', 10000),
        )

        dvc_client = DevCycleLocalClient(sdk_key, dvc_options)

        if waitForInitialization:
            start_time = time.time()
            while not dvc_client.is_initialized():
                time.sleep(0.05)
                if time.time() - start_time > 2:
                    logger.warning("Client initialization timed out after 2 seconds")
                    break

    data_store['clients'][client_id] = dvc_client

    success = {
        "message": "success"
    }

    return success, 201, {"Location": 'client/' + client_id}
