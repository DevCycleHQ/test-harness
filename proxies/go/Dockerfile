# reference https://github.com/docker-library/golang/issues/209#issuecomment-530591780

FROM golang:1.19 as builder

ARG GO_SDK_VERSION
ENV GO_SDK_VERSION $GO_SDK_VERSION

ARG SDK_GITHUB_SHA
ENV SDK_GITHUB_SHA $SDK_GITHUB_SHA

ARG SDKS_TO_TEST
ENV SDKS_TO_TEST $SDKS_TO_TEST

ENV CGO_ENABLED 0
ENV GOOS linux

WORKDIR /app
COPY go.mod ./
COPY go.sum ./
COPY install.sh ./

RUN ./install.sh

RUN go mod download
COPY *.go ./
RUN go build -a -installsuffix cgo -o proxy .


FROM alpine:latest

RUN apk --no-cache add ca-certificates

# Copy the pre-built binary file from the previous stage
COPY --from=builder /app/proxy .

EXPOSE 3000

ENTRYPOINT ["./proxy"]
