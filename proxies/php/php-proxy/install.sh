#!/bin/bash
set -e

if [ -n "$SDK_GITHUB_SHA" ] && [[ "$SDKS_TO_TEST" =~ .*"php"* ]]; then
  echo "Installing PHP SDK at $SDK_GITHUB_SHA"
  composer require "devcycle/php-server-sdk:dev-main#$SDK_GITHUB_SHA"
elif [ -n "$PHP_SDK_VERSION" ]; then
  echo "Installing PHP SDK Version ${PHP_SDK_VERSION}"
  composer require "devcycle/php-server-sdk:$PHP_SDK_VERSION"
else
  echo "Installing latest PHP SDK"
  composer require "devcycle/php-server-sdk:dev-main"
fi
