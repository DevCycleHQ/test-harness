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
2. Comment out the `nodejs` container in `docker-compose.yml`
3. Set the environment variable `LOCAL_MODE` to `1`
4. Set the environment variable `SDKS_TO_TEST` to `nodejs`
5. Run `yarn start:nodejs` in the root of the `test-harness` repository to start the proxy server process
6. Run `yarn test` in the root of the `test-harness` repository (in a different shell) to run the tests


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

Add this line to the bottom of the `go.mod` file in `proxies/go`:
```
replace github.com/devcyclehq/go-server-sdk/v2 => ../../../go-server-sdk
```

Run `go mod tidy` in the same directory

Follow the same numbered steps as above for NodeJS, substituting `go` for `nodejs` in the environment variables
and shell commands.

## Java
Ensure you have the [java-server-sdk](https://github.com/DevCycleHQ/java-server-sdk) repository cloned in the same parent directory as
the `test-harness` repository.

Uncomment the lines in `build.gradle` and `settings.gradle` in the `proxies/java` folder which are in reference to the
local SDK:

`build.grade`
```
// comment the original dependency out
// implementation("com.devcycle:java-server-sdk:${System.getenv('JAVA_SDK_VERSION') ?: "+"}")

//uncomment the local dependency
implementation project(':java-server-sdk')
```

`settings.gradle`
```
include ':java-server-sdk'
project(':java-server-sdk').projectDir = new File('../../../java-server-sdk') 
```

Follow the same numbered steps as above for NodeJS, substituting `java` for `nodejs` in the environment variables
and shell commands.
