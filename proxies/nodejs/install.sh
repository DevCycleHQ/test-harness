if [ -z "$NODEJS_SDK_VERSION" ]; then
    yarn add @devcycle/nodejs-server-sdk
else
    yarn add @devcycle/nodejs-server-sdk@$NODEJS_SDK_VERSION
fi
