# reference https://github.com/docker-library/golang/issues/209#issuecomment-530591780

FROM golang:1.22.2 as builder

ARG GO_SDK_VERSION
ENV GO_SDK_VERSION $GO_SDK_VERSION

ARG SDK_GITHUB_SHA
ENV SDK_GITHUB_SHA $SDK_GITHUB_SHA

ARG SDKS_TO_TEST
ENV SDKS_TO_TEST $SDKS_TO_TEST

ARG GO_BUILD_TAGS
ENV GO_BUILD_TAGS ${GO_BUILD_TAGS:+-tags $GO_BUILD_TAGS}

WORKDIR /app
COPY go.mod ./
COPY go.sum ./
COPY install.sh ./

RUN ./install.sh

RUN go mod download
COPY *.go ./
RUN go build -o proxy ${GO_BUILD_TAGS} .

EXPOSE 3000
ENTRYPOINT ["./proxy"]
