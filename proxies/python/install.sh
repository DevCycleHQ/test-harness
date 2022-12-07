if [ "$PYTHON_SDK_VERSION" ]; then
    echo "Installing Python SDK Version ${PYTHON_SDK_VERSION}"
    pip install -IV devcycle-python-server-sdk==$PYTHON_SDK_VERSION
else
    pip install -IV devcycle-python-server-sdk
fi