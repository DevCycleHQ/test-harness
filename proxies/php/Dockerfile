FROM composer as composer
WORKDIR /app
COPY php-proxy/ ./

RUN composer install --optimize-autoloader --no-interaction --no-progress

FROM golang:alpine as go

WORKDIR /sidecar-manager

COPY sidecar-manager/go.mod sidecar-manager/go.sum ./
RUN go mod download && go mod verify

COPY sidecar-manager/main.go /sidecar-manager/main.go
RUN CGOENABLED=0 go build -tags=native_bucketing -v -o sidecar-manager ./main.go

FROM trafex/php-nginx:latest

COPY --chown=nginx --from=composer /app /var/www/html
COPY --from=go /sidecar-manager/sidecar-manager /
COPY ./nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY ./startup.sh /
USER root
RUN apk add coreutils
USER nobody
EXPOSE 8080
CMD ["/startup.sh"]