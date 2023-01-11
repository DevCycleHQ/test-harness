if [ -n "$SDK_GITHUB_SHA" ] && [[ "$SDKS_TO_TEST" =~ .*"go"* ]]; then
    go get "github.com/devcyclehq/go-server-sdk@$SDK_GITHUB_SHA"
elif [ -z "$GO_SDK_VERSION" ]; then
    go get "github.com/devcyclehq/go-server-sdk"
else
    go get "github.com/devcyclehq/go-server-sdk@$GO_SDK_VERSION"
fi
