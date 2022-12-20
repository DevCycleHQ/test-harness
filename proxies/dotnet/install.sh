if [ -n "$SDK_GITHUB_SHA" ] && [[ "$SDKS_TO_TEST" =~ .*"dotnet"* ]]; then
    # changing directory so dotnet doesn't run again when starting up the server
    cd ..
    git clone https://github.com/DevCycleHQ/dotnet-server-sdk.git
    cd dotnet-server-sdk
    git checkout $SDK_GITHUB_SHA
    cd DevCycle.SDK.Server.Common
    dotnet build
    cd ..
    cd DevCycle.SDK.Server.Local
    dotnet build
    cd ..
    cd DevCycle.SDK.Server.Cloud
    dotnet build
    cd ../src
    dotnet add package DevCycle.SDK.Server.Common -s "../dotnet-server-sdk/DevCycle.SDK.Server.Common/bin/Debug"
fi

if [ "$DOTNET_LOCAL_SDK_VERSION" ]; then
    echo "Installing .NET Local SDK Version ${DOTNET_LOCAL_SDK_VERSION}"
    dotnet add package DevCycle.SDK.Server.Local --version $DOTNET_LOCAL_SDK_VERSION
elif [ -z "$SDK_GITHUB_SHA" ]; then
    dotnet add package DevCycle.SDK.Server.Local
else 
    dotnet add package DevCycle.SDK.Server.Local -s "../dotnet-server-sdk/DevCycle.SDK.Server.Local/bin/Debug"
fi

if [ "$DOTNET_CLOUD_SDK_VERSION" ]; then
    echo "Installing .NET Cloud SDK Version ${DOTNET_CLOUD_SDK_VERSION}"
    dotnet add package DevCycle.SDK.Server.Cloud --version $DOTNET_CLOUD_SDK_VERSION
elif [ -z "$SDK_GITHUB_SHA" ]; then
    dotnet add package DevCycle.SDK.Server.Cloud
else 
    dotnet add package DevCycle.SDK.Server.Cloud -s "../dotnet-server-sdk/DevCycle.SDK.Server.Cloud/bin/Debug"
fi
