FROM node:lts-alpine

ARG NODEJS_SDK_VERSION
ENV NODEJS_SDK_VERSION $NODEJS_SDK_VERSION

ARG SDK_GITHUB_SHA
ENV SDK_GITHUB_SHA $SDK_GITHUB_SHA

ARG SDKS_TO_TEST
ENV SDKS_TO_TEST $SDKS_TO_TEST

RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh protoc python3 py3-pip make g++

# Set Python alias if necessary
RUN ln -sf python3 /usr/bin/python

COPY . /app
WORKDIR /app
RUN yarn
ENTRYPOINT yarn ts-node app.ts
