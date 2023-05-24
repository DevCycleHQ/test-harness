#!/bin/bash

if [ -n "$SDK_GITHUB_SHA" ] && [[ "$SDKS_TO_TEST" =~ .*"php"* ]]; then
  echo "$SDK_GITHUB_SHA"
  composer require "devcycle/php-server-sdk:dev-main#$SDK_GITHUB_SHA"
elif [ -z "$PHP_SDK_VERSION" ]; then
  composer require "devcycle/php-server-sdk:dev-main"
else
  composer require "devcycle/php-server-sdk:$PHP_SDK_VERSION"
fi
