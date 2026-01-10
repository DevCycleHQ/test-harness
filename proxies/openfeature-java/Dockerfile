FROM gradle:8.6.0-jdk17-alpine

ARG OF_JAVA_SDK_VERSION
ENV OF_JAVA_SDK_VERSION $OF_JAVA_SDK_VERSION

ARG SDK_GITHUB_SHA
ENV SDK_GITHUB_SHA $SDK_GITHUB_SHA

ARG SDKS_TO_TEST
ENV SDKS_TO_TEST $SDKS_TO_TEST

RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh

COPY . /app
WORKDIR /app

RUN echo "Docker: install.sh"
RUN ./install.sh

RUN echo "Docker: gradle bootJar"
RUN gradle bootJar

ENTRYPOINT java -jar build/libs/openfeature-java-proxy.jar