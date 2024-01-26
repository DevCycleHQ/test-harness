#!/bin/bash
set -e
if [ -n "$SDK_GITHUB_SHA" ] && [[ "$SDKS_TO_TEST" =~ .*"of-nodejs"* ]]; then
    git clone https://github.com/DevCycleHQ/js-sdks.git
    cd js-sdks
    git checkout $SDK_GITHUB_SHA
    yarn
    # run yarn again to fix any native dependencies that weren't built the first time
    # TODO find out why this is necessary
    yarn
    NX_DAEMON=false yarn nx build nodejs --verbose
    cd ..

    echo "touch yarn.lock files"
    # convince yarn that these packages arent part of a workspace by writing empty lock files
    touch js-sdks/dist/sdk/nodejs/yarn.lock
    touch js-sdks/dist/lib/shared/types/yarn.lock
    touch js-sdks/lib/shared/bucketing-assembly-script/yarn.lock

    echo "yarn link, yarn version: $(yarn -v)"
    yarn link js-sdks/dist/lib/shared/types/
    yarn link js-sdks/lib/shared/bucketing-assembly-script/
    yarn link js-sdks/dist/sdk/nodejs/

    echo "Installed nodejs-server-sdk@$SDK_GITHUB_SHA"
elif [ -z "$OF_NODEJS_SDK_VERSION" ]; then
    yarn add @devcycle/nodejs-server-sdk@latest
    echo "Installed nodejs-server-sdk@latest"
else
    yarn add @devcycle/nodejs-server-sdk@$OF_NODEJS_SDK_VERSION
    echo "Installed nodejs-server-sdk@$OF_NODEJS_SDK_VERSION"
fi

echo "yarn nodejs-server-sdk why:"
yarn why @devcycle/nodejs-server-sdk
