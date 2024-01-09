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
    NX_DAEMON=false yarn nx build openfeature-nodejs-provider --verbose
    cd ..

    echo "touch yarn.lock files"
    # convince yarn that these packages arent part of a workspace by writing empty lock files
    touch js-sdks/dist/sdk/nodejs/yarn.lock
    touch js-sdks/dist/sdk/openfeature-nodejs-provider/yarn.lock
    touch js-sdks/dist/lib/shared/types/yarn.lock
    touch js-sdks/lib/shared/bucketing-assembly-script/yarn.lock

    echo "yarn link"
    yarn link js-sdks/dist/lib/shared/types/
    yarn link js-sdks/lib/shared/bucketing-assembly-script/
    yarn link js-sdks/dist/sdk/nodejs/
    yarn link js-sdks/dist/sdk/openfeature-nodejs-provider/

    echo "Installed openfeature-nodejs-provider@$SDK_GITHUB_SHA"
elif [ -z "$OF_NODEJS_SDK_VERSION" ]; then
    yarn add @devcycle/openfeature-nodejs-provider@latest
    echo "Installed openfeature-nodejs-provider@latest"
else
    yarn add @devcycle/openfeature-nodejs-provider@$OF_NODEJS_SDK_VERSION
    echo "Installed openfeature-nodejs-provider@$OF_NODEJS_SDK_VERSION"
fi

echo "yarn nodejs-server-sdk why:"
yarn why @devcycle/nodejs-server-sdk
echo "yarn openfeature-nodejs-provider why:"
yarn why @devcycle/openfeature-nodejs-provider
