FROM gradle:7.5.1-jdk17 AS build
COPY --chown=gradle:gradle . /home/gradle/src/
WORKDIR /home/gradle/src

ARG JAVA_SDK_VERSION
ENV JAVA_SDK_VERSION $JAVA_SDK_VERSION

RUN gradle build --no-daemon

FROM openjdk:17-jdk-slim-buster

EXPOSE 3000

RUN mkdir /app

COPY --from=build /home/gradle/src/build/libs/proxy.jar /app/proxy.jar

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom","-jar","/app/proxy.jar"]
