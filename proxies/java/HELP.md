# Getting Started

### Reference Documentation
For further reference, please consider the following sections:

* [Official Gradle documentation](https://docs.gradle.org)
* [Spring Boot Gradle Plugin Reference Guide](https://docs.spring.io/spring-boot/docs/3.0.0/gradle-plugin/reference/html/)
* [Create an OCI image](https://docs.spring.io/spring-boot/docs/3.1.0/gradle-plugin/reference/html/#build-image)

### Additional Links
These additional references should also help you:

* [Gradle Build Scans – insights for your project's build](https://scans.gradle.com#gradle)


### Local Project Setup

The proxy server requires that you have a valid Java SDK installed of v17 or higher, with a 64-bit, x86 architecture runtime.

One you have it installed make sure it is configured properly in Intellij (and cmd line) to both run the project and gradle.

#### Project SDK
* `File > Project Structure > Project Settings > Project > SDK`

#### Setup Gradle
* You need to do this if you want to run inside the IDE and do debugging
* `Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JVM`


### Running the Proxy Server

Either run it in the IDE by running the `main` method in `ProxyApplication.java` or run it from the command line (see below):

```bash
export JAVA_HOME="/Library/Java/JavaVirtualMachines/amazon-corretto-17.jdk/Contents/Home"
gradle build 
java -jar build/libs/proxy.jar
```