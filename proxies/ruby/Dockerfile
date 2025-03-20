FROM ruby as builder

ARG RUBY_SDK_VERSION
ENV RUBY_SDK_VERSION $RUBY_SDK_VERSION

ARG SDK_GITHUB_SHA
ENV SDK_GITHUB_SHA $SDK_GITHUB_SHA

ARG SDKS_TO_TEST
ENV SDKS_TO_TEST $SDKS_TO_TEST

# Install dependencies required for native gem extensions
RUN apt-get update && apt-get install -y \
    build-essential \
    libclang-dev \
    llvm-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY Gemfile ./
COPY install.sh ./

RUN echo $(ls -alh)

RUN ./install.sh

RUN bundle install
COPY *.rb ./
COPY config.ru ./

EXPOSE 3000
ENTRYPOINT ["puma", "config.ru", "-C", "puma.rb"]
