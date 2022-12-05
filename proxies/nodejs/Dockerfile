FROM node:lts-alpine
ARG NODEJS_SDK_VERSION
ENV NODEJS_SDK_VERSION $NODEJS_SDK_VERSION

ARG GITHUB_SHA
ENV GITHUB_SHA $GITHUB_SHA

RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh

COPY . /app
WORKDIR /app
RUN yarn
RUN ./install.sh 
ENTRYPOINT yarn ts-node app.ts
