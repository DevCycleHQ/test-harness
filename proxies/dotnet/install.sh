if [ "$DOTNET_LOCAL_SDK_VERSION" ]; then
    echo "Installing .NET Local SDK Version ${DOTNET_LOCAL_SDK_VERSION}"
    dotnet add package DevCycle.SDK.Server.Local --version $DOTNET_LOCAL_SDK_VERSION
else
    dotnet add package DevCycle.SDK.Server.Local
fi

if [ "$DOTNET_CLOUD_SDK_VERSION" ]; then
    echo "Installing .NET Cloud SDK Version ${DOTNET_CLOUD_SDK_VERSION}"
    dotnet add package DevCycle.SDK.Server.Cloud --version $DOTNET_CLOUD_SDK_VERSION
else
    dotnet add package DevCycle.SDK.Server.Cloud
fi