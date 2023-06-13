#!/bin/bash

if [ -n "$SDK_GITHUB_SHA" ] && [[ "$SDKS_TO_TEST" =~ .*"of-nodejs"* ]]; then
    yarn remove @devcycle/openfeature-nodejs-provider
    yarn remove @devcycle/nodejs-server-sdk

    git clone https://github.com/DevCycleHQ/js-sdks.git
    cd js-sdks
    git checkout $SDK_GITHUB_SHA
    yarn
    NX_DAEMON=false yarn nx build openfeature-nodejs-provider --verbose
    cd ..

    # convince yarn that these packages arent part of a workspace by writing empty lock files
    touch js-sdks/dist/sdk/nodejs/yarn.lock
    touch js-sdks/dist/sdk/openfeature-nodejs-provider/yarn.lock
    touch js-sdks/dist/lib/shared/types/yarn.lock
    touch js-sdks/lib/shared/bucketing-assembly-script/yarn.lock

    yarn link js-sdks/dist/sdk/nodejs/
    yarn link js-sdks/dist/sdk/openfeature-nodejs-provider/
    yarn link js-sdks/lib/shared/bucketing-assembly-script/
    yarn link js-sdks/dist/lib/shared/types/
elif [ -z "$OF_NODEJS_SDK_VERSION" ]; then
    yarn add @devcycle/nodejs-server-sdk@latest
else
    yarn add @devcycle/nodejs-server-sdk@$OF_NODEJS_SDK_VERSION
fi
