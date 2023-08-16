#!/bin/bash

if [ -n "$SDK_GITHUB_SHA" ] && [[ "$SDKS_TO_TEST" =~ .*"nodejs"* ]]; then
    cd ..
    git clone https://github.com/DevCycleHQ/js-sdks.git
    cd js-sdks
    git checkout $SDK_GITHUB_SHA
    sed -i '/cypress/d' package.json
    pnpm install --
    NX_DAEMON=false pnpm nx build nodejs --verbose
    cd ../app

    # Change NODE_ENV so pnpm only installs prod dependencies
    export NODE_ENV=production
    pnpm link ../js-sdks/dist/lib/shared/types/
    pnpm link ../js-sdks/lib/shared/bucketing-assembly-script/
    pnpm link ../js-sdks/dist/sdk/nodejs/

    echo "Installed nodejs-server-sdk@$SDK_GITHUB_SHA"
elif [ -z "$NODEJS_SDK_VERSION" ]; then
    pnpm add @devcycle/nodejs-server-sdk@latest
    echo "Installed nodejs-server-sdk@latest"
else
    pnpm add @devcycle/nodejs-server-sdk@$NODEJS_SDK_VERSION
    echo "Installed nodejs-server-sdk@$NODEJS_SDK_VERSION"
fi

echo "pnpm nodejs-server-sdk why:"
pnpm why @devcycle/nodejs-server-sdk
