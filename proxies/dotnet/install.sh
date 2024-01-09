#!/bin/bash
set -e

if [[ -n "$SDK_GITHUB_SHA" && "$SDKS_TO_TEST" == *"dotnet"* ]]; then
    echo "Checking out SDK at $SDK_GITHUB_SHA"
    # changing directory so dotnet doesn't run again when starting up the server
    cd ..
    git clone https://github.com/DevCycleHQ/dotnet-server-sdk.git
    cd dotnet-server-sdk
    git checkout $SDK_GITHUB_SHA
    dotnet restore
    cd ../src
    dotnet remove package DevCycle.SDK.Server.Local
    dotnet remove package DevCycle.SDK.Server.Cloud
    dotnet add reference "../dotnet-server-sdk/DevCycle.SDK.Server.Local/DevCycle.SDK.Server.Local.csproj"
    dotnet add reference "../dotnet-server-sdk/DevCycle.SDK.Server.Cloud/DevCycle.SDK.Server.Cloud.csproj"
    dotnet restore
    exit 0
fi

if [ "$DOTNET_LOCAL_SDK_VERSION" ]; then
    echo "Installing .NET Local SDK Version ${DOTNET_LOCAL_SDK_VERSION}"
    dotnet add package DevCycle.SDK.Server.Local --version $DOTNET_LOCAL_SDK_VERSION
else
    echo "Installing .NET Local SDK Version latest"
    dotnet add package DevCycle.SDK.Server.Local
fi

if [ "$DOTNET_CLOUD_SDK_VERSION" ]; then
    echo "Installing .NET Cloud SDK Version ${DOTNET_CLOUD_SDK_VERSION}"
    dotnet add package DevCycle.SDK.Server.Cloud --version $DOTNET_CLOUD_SDK_VERSION
else
    echo "Installing .NET Cloud SDK Version latest"
    dotnet add package DevCycle.SDK.Server.Cloud
fi

