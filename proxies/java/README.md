# Getting Started

## Requirements

The proxy server requires that you have a valid Java SDK installed of v17 or higher, with a 64-bit, x86 architecture runtime.

In addition, it requires [Gradle](https://gradle.org/) >= 7.6+ to be installed.

### M1 Macs / Apple Silicon Architecture

There is a known issue with the Docker build of the Java proxy when you are on a M1. The image built ends up using an `aarch64` architecture
and the JVM will run the Java Server SDK properly, generating numerous JNI errors when talking to the WASM. If you are looking to run the Test Harness for Java,
it is recommended you do it in **Local Mode** and not use the Docker image directly.

## Reference Documentation

For further reference, please consider the following sections:

- [Official Gradle documentation](https://docs.gradle.org)
- [Spring Boot Gradle Plugin Reference Guide](https://docs.spring.io/spring-boot/docs/3.0.0/gradle-plugin/reference/html/)
- [Create an OCI image](https://docs.spring.io/spring-boot/docs/3.1.0/gradle-plugin/reference/html/#build-image)

### Additional Links

These additional references should also help you:

- [Gradle Build Scans – insights for your project's build](https://scans.gradle.com#gradle)

## Local Project Setup in IntelliJ

Once you have to code for both the proxy and the java server sdk setup you need to configure the project in
IntelliJ. The java proxy must use a Java 17 VM that is 64-bit and x86 architecture. The Java Server SDK must
use a JVM that is 64-bit and x86 compatible. Both the IDE and Gradle need to use the same JDK version.

### Set Project SDK

- `File > Project Structure > Project Settings > Project > SDK`

### Set Gradle VM

- You need to do this if you want to run inside the IDE and do debugging
- `Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JVM`

## Running the Proxy Server

Either run it in the IDE by running the `main` method in `ProxyApplication.java` or run it from the command line (see below):

```bash
export JAVA_HOME="/Library/Java/JavaVirtualMachines/amazon-corretto-17.jdk/Contents/Home"
gradle build
java -jar build/libs/proxy.jar
```

Building with a specific JDK version:

```bash
JAVA_SDK_VERSION=1.5.1 gradle build
```

Building on a local proxy:

```bash
LOCAL_MODE=1 gradle build
```

When you build in local mode, it is expected that the Java Server SDK exist locally in `../../../java-server-sdk`.
