# SDK Test Harness

The shared test harness for testing DevCycle SDKs

## Introduction

The test harness is a tool which defines a set of standardized tests that can run against multiple SDKs written in
different languages.

Currently it includes tests for serverside SDKs, for both cloud and local bucketing modes.

The tests are written in Jest and run against a series of "proxy servers" written in the native language of each SDK.

## Running the Tests

### Prerequisites

You must have Docker installed and running on your machine. You must also have a working copy of Node 18+ and Yarn.

### Steps

- Install dependencies with `yarn`
- Run test suite with `yarn test`

This will automatically start the proxy servers using `docker-compose` and run the tests against them.

### Environment Variables

There are environment variables which can be used to control which SDK to run the tests for, and which version
They are:

- `SDKS_TO_TEST` - The name of the SDK to run the tests for. Possible values include `nodejs`, `go` etc.
- `{SDK NAME}_SDK_VERSION` - The version of the given SDK to run the tests for. eg. `NODEJS_SDK_VERSION=1.2.3`
- `SDK_GITHUB_SHA` - The sha of an unreleased commit of the SDK to run the tests against. This version will be checked
  out directly from Github.

## Debugging a failing test

If a test run fails for a particular SDK change, use the environment variables above to run the tests locally
against the version of the SDK causing the issue. It also helps to isolate the test failure by running against
a particular test file, or using `it.only` to run only a single test within a file.

You can run yarn much faster against a single test file with:

```
yarn test --testPathPattern='variable.local'
```

or against a single test in that file (the matching against dynamic test names is tricky, so you might not be able to just run one):

```
yarn test --testPathPattern='variable.local' --testNamePattern='should return a valid unicode string'
```

It is also typically necessary to run the SDK proxy server locally in order to log / debug what is going on.
See the section below on running the harness against a local SDK.

If debugging tests against a known version, you can speed up iteration by running with the watch flag:

```
yarn test --watch
```

That will keep the docker containers running the proxies alive, and pop up a menu in the terminal for re-running tests, failures, etc.

## Running the harness against a local SDK

You can run the proxy server for the SDK you want to work on using:
`yarn start:{sdk}` eg. `yarn start:nodejs`

When running proxy tests, use the following environment variables to specify local mode:

```
LOCAL_MODE=1 SDKS_TO_TEST=nodejs yarn test
```

This will point the test harness at a proxy running at http://localhost:3000, and disable all the containers in docker-compose. See [these instructions](docs/LOCAL.md) for details on how to run the proxy for each SDK.

A specific version of docker-compose may be required to support the profiles in the docker-compose.yml config file. 1.29.2 seems to work.

You may still need to run the package manager for the particular proxy (e.g. `yarn`, `go mod tidy` etc.)

## Development

To understand how the system works and write new proxies, see the documentation in the `docs` folder.
