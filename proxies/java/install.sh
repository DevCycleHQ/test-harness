#!/bin/bash

if [[ -n "$SDK_GITHUB_SHA" ]]; then
    echo "Checking out SDK at $SDK_GITHUB_SHA"
    cd ..
    git clone https://github.com/DevCycleHQ/java-server-sdk.git
    cd java-server-sdk
    git checkout $SDK_GITHUB_SHA
fi

