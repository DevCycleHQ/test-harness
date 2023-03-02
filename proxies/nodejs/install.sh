if [ -n "$SDK_GITHUB_SHA" ] && [[ "$SDKS_TO_TEST" =~ .*"nodejs"* ]]; then
    git clone https://github.com/DevCycleHQ/js-sdks.git
    cd js-sdks
    git checkout $SDK_GITHUB_SHA
    yarn
    NX_DAEMON=false yarn nx build nodejs --verbose
    cd ..
    yarn add @devcycle/nodejs-server-sdk@file:js-sdks/dist/sdk/nodejs/
    yarn add @devcycle/bucketing-assembly-script@file:js-sdks/lib/shared/bucketing-assembly-script/
    yarn add @devcycle/types@file:js-sdks/lib/shared/types/
elif [ -z "$NODEJS_SDK_VERSION" ]; then
    yarn add @devcycle/nodejs-server-sdk@latest
else
    yarn add @devcycle/nodejs-server-sdk@$NODEJS_SDK_VERSION
fi
