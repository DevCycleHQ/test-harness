FROM node:lts-alpine

RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh

COPY . /app
WORKDIR /app
RUN yarn
ENTRYPOINT yarn ts-node app.ts
