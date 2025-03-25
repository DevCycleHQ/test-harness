FROM node:lts-alpine

ARG OF_NODEJS_SDK_VERSION
ENV OF_NODEJS_SDK_VERSION $OF_NODEJS_SDK_VERSION

ARG SDK_GITHUB_SHA
ENV SDK_GITHUB_SHA $SDK_GITHUB_SHA

ARG SDKS_TO_TEST
ENV SDKS_TO_TEST $SDKS_TO_TEST

RUN apk update && apk upgrade && \
    apk add --no-cache \
    bash \
    git \
    openssh \
    protoc \
    python3 \
    py3-pip \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    pixman-dev \
    giflib-dev \
    librsvg-dev \
    pkgconfig \
    py3-setuptools \
    build-base \
    python3-dev \
    gcc \
    musl-dev \
    cairo \
    pango \
    jpeg \
    pixman \
    giflib \
    librsvg

# Set Python alias if necessary
RUN ln -sf python3 /usr/bin/python

COPY . /app
WORKDIR /app

RUN echo "Docker: yarn"
RUN corepack enable
RUN yarn

RUN echo "Docker: install.sh"
RUN ./install.sh

ENTRYPOINT yarn ts-node app.ts
