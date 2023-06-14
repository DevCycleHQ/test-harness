#!/bin/bash

if [ -n "$SDK_GITHUB_SHA" ] && [[ "$SDKS_TO_TEST" =~ .*"nodejs"* ]]; then
    git clone https://github.com/DevCycleHQ/js-sdks.git
    cd js-sdks
    git checkout $SDK_GITHUB_SHA
    yarn
    NX_DAEMON=false yarn nx build nodejs --verbose
    cd ..

    # convince yarn that these packages arent part of a workspace by writing empty lock files
    echo "touch yarn.lock files"
    touch js-sdks/dist/lib/shared/types/yarn.lock
    touch js-sdks/lib/shared/bucketing-assembly-script/yarn.lock
    touch js-sdks/dist/sdk/nodejs/yarn.lock

    yarn link js-sdks/dist/lib/shared/types/
    yarn link js-sdks/lib/shared/bucketing-assembly-script/
    yarn link js-sdks/dist/sdk/nodejs/

    echo "Installed nodejs-server-sdk@$SDK_GITHUB_SHA"
elif [ -z "$NODEJS_SDK_VERSION" ]; then
    yarn add @devcycle/nodejs-server-sdk@latest
    echo "Installed nodejs-server-sdk@latest"
else
    yarn add @devcycle/nodejs-server-sdk@$NODEJS_SDK_VERSION
    echo "Installed nodejs-server-sdk@$NODEJS_SDK_VERSION"
fi

echo "yarn nodejs-server-sdk why: /n$(yarn why @devcycle/nodejs-server-sdk)"