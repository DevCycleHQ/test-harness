if [ -n "$SDK_GITHUB_SHA" ] && [[ "$SDKS_TO_TEST" =~ .*"java"* ]]; then
    git clone https://github.com/DevCycleHQ/java-server-sdk.git
    cd java-server-sdk
    git checkout $SDK_GITHUB_SHA
    ./gradlew
fi