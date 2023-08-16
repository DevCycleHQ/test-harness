#!/bin/bash

if [ -n "$SDK_GITHUB_SHA" ] && [[ "$SDKS_TO_TEST" =~ .*"of-nodejs"* ]]; then
    cd ..
    git clone https://github.com/DevCycleHQ/js-sdks.git
    cd js-sdks
    git checkout $SDK_GITHUB_SHA
    pnpm install
    NX_DAEMON=false pnpm nx build openfeature-nodejs-provider --verbose
    cd ../app

    echo "pnpm link"
    # Change NODE_ENV so pnpm only installs prod dependencies
    export NODE_ENV=production
    pnpm link ../js-sdks/dist/lib/shared/types/
    pnpm link ../js-sdks/lib/shared/bucketing-assembly-script/
    pnpm link ../js-sdks/dist/sdk/nodejs/
    pnpm link ../js-sdks/dist/sdk/openfeature-nodejs-provider/

    echo "Installed openfeature-nodejs-provider@$SDK_GITHUB_SHA"
elif [ -z "$OF_NODEJS_SDK_VERSION" ]; then
    pnpm add @devcycle/openfeature-nodejs-provider@latest
    echo "Installed openfeature-nodejs-provider@latest"
else
    pnpm add @devcycle/openfeature-nodejs-provider@$OF_NODEJS_SDK_VERSION
    echo "Installed openfeature-nodejs-provider@$OF_NODEJS_SDK_VERSION"
fi

echo "pnpm nodejs-server-sdk why:"
pnpm why @devcycle/nodejs-server-sdk
echo "pnpm openfeature-nodejs-provider why:"
pnpm why @devcycle/openfeature-nodejs-provider
