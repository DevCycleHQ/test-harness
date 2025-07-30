#!/bin/bash
set -e

if [ -n "$SDK_GITHUB_SHA" ] && [[ "$SDKS_TO_TEST" =~ .*"of-java"* ]]; then
    echo "Cloning java-sdks repository and checking out $SDK_GITHUB_SHA"
    git clone https://github.com/DevCycleHQ/java-sdks.git ../../java-sdks
    cd ../../java-sdks
    git checkout $SDK_GITHUB_SHA
    cd /app
    echo "Installed java-server-sdk@$SDK_GITHUB_SHA"
elif [ -z "$OF_JAVA_SDK_VERSION" ]; then
    echo "Using latest version of java-server-sdk"
else
    echo "Using java-server-sdk@$OF_JAVA_SDK_VERSION"
fi