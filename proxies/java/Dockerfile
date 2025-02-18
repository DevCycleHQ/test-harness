FROM gradle:8.12.1-jdk17 AS build
COPY --chown=gradle:gradle . /home/gradle/src/
WORKDIR /home/gradle/src

ARG SDK_GITHUB_SHA
ENV SDK_GITHUB_SHA $SDK_GITHUB_SHA

ARG SDKS_TO_TEST
ENV SDKS_TO_TEST $SDKS_TO_TEST

ARG JAVA_SDK_VERSION
ENV JAVA_SDK_VERSION $JAVA_SDK_VERSION

RUN ./install.sh && \
    gradle build --info --no-daemon

EXPOSE 3000

RUN mkdir /app && \
    cp /home/gradle/src/build/libs/proxy.jar /app/proxy.jar

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom","-jar","/app/proxy.jar"]
