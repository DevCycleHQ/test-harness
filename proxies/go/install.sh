#!/bin/bash
set -e

if [ -n "$SDK_GITHUB_SHA" ] && [[ "$SDKS_TO_TEST" =~ .*"go"* ]]; then
    go get "github.com/devcyclehq/go-server-sdk/v2@$SDK_GITHUB_SHA"
elif [ -z "$GO_SDK_VERSION" ]; then
    go get "github.com/devcyclehq/go-server-sdk/v2@main"
else
    go get "github.com/devcyclehq/go-server-sdk/v2@$GO_SDK_VERSION"
fi
