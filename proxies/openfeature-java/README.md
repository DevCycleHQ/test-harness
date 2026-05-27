# OpenFeature Java Proxy

This is a proxy service that bridges between the test harness and the DevCycle Java SDK. While initially intended to use OpenFeature for flag evaluation, it currently uses the DevCycle SDK directly due to the lack of an official DevCycle OpenFeature provider for Java.

## Overview

The OpenFeature Java Proxy provides the same functionality as the regular Java proxy and maintains compatibility with the existing test harness. It supports both local and cloud bucketing configurations using the DevCycle Java SDK.

## Features

- **DevCycle Integration**: Uses DevCycle Java SDK directly for feature flag evaluation
- **Multiple Client Types**: Supports both DevCycle local and cloud clients  
- **EdgeDB Support**: Compatible with EdgeDB when using cloud bucketing
- **Local Bucketing**: Supports local flag evaluation for reduced latency
- **OpenFeature API Compatibility**: Maintains the same API interface as the OpenFeature Node.js proxy

## API Endpoints

### GET /spec
Returns the proxy specification including name, version, and capabilities.

### POST /client
Creates a new client instance with the specified configuration.

### POST /*/*
Executes commands on existing client instances.

## Building and Running

```bash
# Build the application
./gradlew bootJar

# Run the application
java -jar build/libs/openfeature-java-proxy.jar
```

## Docker

```bash
# Build the Docker image
docker build -t openfeature-java-proxy .

# Run the container
docker run -p 3000:3000 openfeature-java-proxy
```

## Environment Variables

- `JAVA_SDK_VERSION`: Specific version of the DevCycle Java SDK to use
- `SDK_GITHUB_SHA`: Git SHA for using a specific development version
- `LOCAL_MODE`: Set to "1" to use local SDK development mode
- `SDKS_TO_TEST`: Comma-separated list of SDKs to test (should include "of-java")

## Implementation Notes

This proxy was originally designed to use OpenFeature for Java, but due to the lack of an official DevCycle OpenFeature provider for Java, it currently uses the DevCycle Java SDK directly. The implementation maintains the same API interface as the OpenFeature Node.js version by:

- Using DevCycle SDK's `variable()` method for flag evaluation
- Converting DevCycle variables to the expected DVCVariable format
- Supporting both local and cloud DevCycle clients
- Maintaining compatibility with the existing test harness commands

Future updates may integrate an official DevCycle OpenFeature provider when available.