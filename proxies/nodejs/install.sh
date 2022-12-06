if [ -n "$GITHUB_SHA" ] && [[ "$SDKS_TO_TEST" =~ .*"nodejs"* ]]; then
    git clone https://github.com/DevCycleHQ/js-sdks.git
    cd js-sdks
    git checkout $GITHUB_SHA
    yarn
    NX_DAEMON=false yarn nx build nodejs --verbose
    cd ..
    yarn add file:js-sdks/dist/sdk/nodejs/
    yarn add file:js-sdks/lib/shared/bucketing-assembly-script/
    yarn add file:js-sdks/lib/shared/types/
elif [ -z "$NODEJS_SDK_VERSION" ]; then
    yarn add @devcycle/nodejs-server-sdk
else
    yarn add @devcycle/nodejs-server-sdk@$NODEJS_SDK_VERSION
fi
