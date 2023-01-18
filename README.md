# test-harness
The shared test harness for testing DevCycle SDKs

## Running the harness against a local SDK
- Have SDK saved in same parent directory as test harness
- Comment out whatever proxy server you want to run locally in `docker-compose.yml`
- Set the environment variable "LOCAL_MODE" to 1
- Follow the instructions to point to a local SDK for whatever language you’re using. See [this document](https://www.notion.so/taplytics/How-to-run-example-apps-against-local-SDKs-for-testing-18da8452603246968f8550cc808b8f30)
