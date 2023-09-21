#!/bin/bash

if [ -n "$SDK_GITHUB_SHA" ] && [[ "$SDKS_TO_TEST" =~ .*"js-cloud"* ]]; then
    git clone https://github.com/DevCycleHQ/js-sdks.git
    cd js-sdks
    git checkout $SDK_GITHUB_SHA
    yarn
    NX_DAEMON=false yarn nx build js-cloud-server-sdk --verbose
    cd ..

    # convince yarn that these packages arent part of a workspace by writing empty lock files
    echo "touch yarn.lock files"
    touch js-sdks/dist/lib/shared/types/yarn.lock
    touch js-sdks/dist/sdk/js-cloud-server/yarn.lock

    yarn link js-sdks/dist/lib/shared/types/
    yarn link js-sdks/dist/sdk/js-cloud-server/

    echo "Installed js-cloud-server-sdk@$SDK_GITHUB_SHA"
elif [ -z "$JS_CLOUD_SDK_VERSION" ]; then
    yarn add @devcycle/js-cloud-server-sdk@latest
    echo "Installed js-cloud-server-sdk@latest"
else
    yarn add @devcycle/js-cloud-server-sdk@$JS_CLOUD_SDK_VERSION
    echo "Installed js-cloud-server-sdk@$JS_CLOUD_SDK_VERSION"
fi

echo "yarn js-cloud-server-sdk why:"
yarn why @devcycle/js-cloud-server-sdk
