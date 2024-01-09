#!/bin/sh
set -e

if [ -n "$SDK_GITHUB_SHA" ]; then
    echo "Checking out python SDK at $SDK_GITHUB_SHA"
    cd ..
    git clone https://github.com/DevCycleHQ/python-server-sdk.git
    cd python-server-sdk
    git checkout $SDK_GITHUB_SHA
    pip install -e ../python-server-sdk/
elif [ -n "$PYTHON_SDK_VERSION" ]; then
    echo "Installing Python SDK Version ${PYTHON_SDK_VERSION}"
    pip install -IV devcycle-python-server-sdk==$PYTHON_SDK_VERSION
else
    echo "Installing latest Python SDK"
    pip install -IV devcycle-python-server-sdk
fi
