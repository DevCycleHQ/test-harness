FROM node:lts
ARG OF_NODEJS_SDK_VERSION
ENV OF_NODEJS_SDK_VERSION $OF_NODEJS_SDK_VERSION

ARG SDK_GITHUB_SHA
ENV SDK_GITHUB_SHA $SDK_GITHUB_SHA

ARG SDKS_TO_TEST
ENV SDKS_TO_TEST $SDKS_TO_TEST

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY . /app
WORKDIR /app
RUN pnpm install
RUN ./install.sh
ENTRYPOINT yarn ts-node app.ts
