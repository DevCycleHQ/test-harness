#!/bin/bash
set -e

if [ -n "$SDK_GITHUB_SHA" ] && [[ "$SDKS_TO_TEST" =~ .*"ruby"* ]]; then
  sed -i "s|gem 'devcycle-ruby-server-sdk'|gem 'devcycle-ruby-server-sdk', github: 'DevCycleHQ/ruby-server-sdk', ref: '$SDK_GITHUB_SHA'|g" Gemfile
elif [ -z "$RUBY_SDK_VERSION" ]; then
    exit 0
else
    sed -i "s|gem 'devcycle-ruby-server-sdk'|gem 'devcycle-ruby-server-sdk', '$RUBY_SDK_VERSION'|g" Gemfile
fi
