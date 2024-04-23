# Run proxy locally against various SDKs

## NodeJS

Ensure you have the [js-sdks](https://github.com/devcyclehq/js-sdks) repository cloned in the same parent directory as
the `test-harness` repository.

Follow the steps in that repo for installing dependencies and building the SDKs.

Then, in the `test-harness` repo, make the following changes in the `proxies/nodejs` folder.
Change the dependency in the `package.json` file to point to the local SDK, and set `resolutions`
to override the version of the dependent packages that will be used to the local ones eg.:

```json
"dependencies": {
  ...
  "@devcycle/bucketing-assembly-script": "portal:../../../js-sdks/lib/shared/bucketing-assembly-script",
},
"resolutions": {
  "@devcycle/nodejs-server-sdk": "portal:../../../js-sdks/dist/sdk/nodejs",
  "@devcycle/types": "portal:../../../js-sdks/dist/lib/shared/types",
}
```

then:

1. Run `yarn` inside the `proxies/nodejs` folder
2. Set the environment variable `LOCAL_MODE` to `1`
3. Set the environment variable `SDKS_TO_TEST` to `nodejs`
4. Run `yarn start:nodejs` in the root of the `test-harness` repository to start the proxy server process
5. Run `yarn test` in the root of the `test-harness` repository (in a different shell) to run the tests

## OpenFeature NodeJS

follow the same steps as NodeJS above, but set the environment variable `SDKS_TO_TEST` to `of-nodejs`,
and use `yarn start:of-nodejs`. Also in the `package.json` file in `proxies/openfeature-nodejs`,
change the dependency to point to the local SDK, and set `resolutions`:

```json
"dependencies": {
  ...
  "@devcycle/bucketing-assembly-script": "portal:../../../js-sdks/lib/shared/bucketing-assembly-script",
},
"resolutions": {
  "@devcycle/nodejs-server-sdk": "portal:../../../js-sdks/dist/sdk/nodejs",
  "@devcycle/types": "portal:../../../js-sdks/dist/lib/shared/types",
  "@devcycle/openfeature-nodejs-provider": "portal:../../../js-sdks/dist/sdk/openfeature-nodejs-provider"
}
```

## DotNet

Ensure you have the [dotnet-server-sdk](https://github.com/DevCycleHQ/dotnet-server-sdk) repository cloned in the same parent directory as
the `test-harness` repository.

Modify the dependencies of the Dotnet proxy server in `proxies/dotnet` to point to the local SDK, eg.:

```xml
<ItemGroup>
	<ProjectReference Include="..\..\..\dotnet-server-sdk\DevCycle.SDK.Server.Common\DevCycle.SDK.Server.Common.csproj" />
	<ProjectReference Include="..\..\..\dotnet-server-sdk\DevCycle.SDK.Server.Cloud\DevCycle.SDK.Server.Cloud.csproj" />
    <ProjectReference Include="..\..\..\dotnet-server-sdk\DevCycle.SDK.Server.Local\DevCycle.SDK.Server.Local.csproj" />
</ItemGroup>
```

then follow the same numbered steps as above for NodeJS, substituting `dotnet` for `nodejs` in the environment variables
and shell commands.

## Go

Ensure you have the [go-server-sdk](https://github.com/DevCycleHQ/go-server-sdk) repository cloned in the same parent directory as
the `test-harness` repository.

Create a `go.work` file in the `<test-harness directory>/proxies/go` directory that will override the dependency on the SDK to point to your local copy:

```
cd proxies/go
go work init .
go work edit -replace github.com/devcyclehq/go-server-sdk/v2=../../../go-server-sdk
```

This assumes your local SDK is in a directory called `go-server-sdk` located next to the top-level test harness directory. Adjust the path as needed.

Run `go mod tidy` in the same directory to resolve any changed dependencies from your local copy.

Follow the same numbered steps as above for NodeJS, substituting `go` for `nodejs` in the environment variables
and shell commands.

## Java

Ensure you have the [java-server-sdk](https://github.com/DevCycleHQ/java-server-sdk) repository cloned in the same parent directory as
the `test-harness` repository.

Set the `LOCAL_MODE` environment variable to `1` and then build and run the proxy:

```
export LOCAL_MODE=1
cd proxies/java
gradle build
java -jar build/libs/proxy.jar
```

This will start the java proxy and run it in local mode. Follow the same numbered steps as above for NodeJS, substituting `java` for `nodejs` in the environment variables
and shell commands.

## Ruby

Ensure you have the [ruby-server-sdk](https://github.com/DevCycleHQ/ruby-server-sdk) repository cloned.

In the `proxies/ruby/Gemfile` file, change the `devcycle-ruby-server-sdk` gem to point to where the SDK is located locally:

`Gemfile`

```
gem 'devcycle-ruby-server-sdk', path: 'path/to/local/sdk'
```

Run `bundle install` in the `proxies/ruby` folder.

Follow the same numbered steps as above for NodeJS, substituting `ruby` for `nodejs` in the environment variables
and shell commands.

## PHP

Ensure that you have a PHP interpreter setup under your project
Run the `index.php` script in the `proxies/php/php-proxy` folder with the environment variable `LOCAL_MODE` set to `1` and `SDKS_TO_TEST` set to `php`.

The "command" only runs against a fixed request body - and you'll need to modify it in order to test properly locally.
You'll need to build that request string from whatever unit test you want to setup - but it's not recommended to use this method for full client init debugging as this doesn't handle
client creation.
