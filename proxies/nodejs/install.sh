if [ "GITHUB_SHA" ]; then
    git clone https://github.com/DevCycleHQ/js-sdks.git
    cd js-sdks
    git checkout $GITHUB_SHA
    yarn
    NX_DAEMON=false yarn nx build nodejs --verbose
    cd ..
    yarn add file:js-sdks/dist/sdk/nodejs/
elif [ -z "$NODEJS_SDK_VERSION" ]; then
    yarn add @devcycle/nodejs-server-sdk
else
    yarn add @devcycle/nodejs-server-sdk@$NODEJS_SDK_VERSION
fi
