#!/bin/bash
set -e
echo "Installing nodejs-server-sdk"

if [ -n "$SDK_GITHUB_SHA" ] && [[ "$SDKS_TO_TEST" =~ .*"nodejs"* ]]; then
    echo "Installing nodejs-server-sdk@$SDK_GITHUB_SHA"

    git clone https://github.com/DevCycleHQ/js-sdks.git
    cd js-sdks
    git checkout $SDK_GITHUB_SHA
    yarn
    # run yarn again to fix any native dependencies that weren't built the first time
    # TODO find out why this is necessary
    yarn
    NX_DAEMON=false yarn nx build nodejs --verbose
    NX_DAEMON=false yarn nx build js --verbose
    cd ..

    # convince yarn that these packages arent part of a workspace by writing empty lock files
    echo "touch yarn.lock files"
    touch js-sdks/dist/lib/shared/types/yarn.lock
    touch js-sdks/lib/shared/bucketing-assembly-script/yarn.lock
    touch js-sdks/dist/sdk/nodejs/yarn.lock
    touch js-sdks/dist/sdk/js/yarn.lock

    echo "yarn link, yarn version: $(yarn -v)"
    yarn link js-sdks/dist/lib/shared/types/
    yarn link js-sdks/lib/shared/bucketing-assembly-script/
    yarn link js-sdks/dist/sdk/nodejs/
    yarn link js-sdks/dist/sdk/js/

    echo "Installed nodejs-server-sdk@$SDK_GITHUB_SHA"
elif [ -z "$NODEJS_SDK_VERSION" ]; then
    echo "Installing nodejs-server-sdk@latest"

    yarn add @devcycle/nodejs-server-sdk@latest
    yarn add @devcycle/js-client-sdk@latest
    echo "Installed nodejs-server-sdk@latest"
else
    echo "Installing nodejs-server-sdk@$NODEJS_SDK_VERSION"

    yarn add @devcycle/nodejs-server-sdk@$NODEJS_SDK_VERSION
    yarn add @devcycle/js-client-sdk@latest
    echo "Installed nodejs-server-sdk@$NODEJS_SDK_VERSION"
fi

echo "yarn nodejs-server-sdk why:"
yarn why @devcycle/nodejs-server-sdk
echo "yarn js-client-sdk why:"
yarn why @devcycle/js-client-sdk
