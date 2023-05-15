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


FROM alpine:3.17
# Setup document root
WORKDIR /var/www/html

# Install packages and remove default server definition
RUN apk add --no-cache \
  curl \
  nginx \
  php81 \
  php81-ctype \
  php81-curl \
  php81-dom \
  php81-fpm \
  php81-gd \
  php81-intl \
  php81-mbstring \
  php81-mysqli \
  php81-opcache \
  php81-openssl \
  php81-phar \
  php81-session \
  php81-xml \
  php81-xmlreader \
  supervisor

# Configure nginx - http
COPY configs/nginx.conf /etc/nginx/nginx.conf

# Configure PHP-FPM
COPY configs/fpm-pool.conf /etc/php81/php-fpm.d/www.conf
COPY configs/php.ini /etc/php81/conf.d/custom.ini

# Configure supervisord
COPY configs/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Make sure files/folders needed by the processes are accessable when they run under the nobody user
RUN chown -R nobody.nobody /var/www/html /run /var/lib/nginx /var/log/nginx

# Switch to use a non-root user from here on
USER nobody

# Add application
COPY --chown=nobody --from=composer /app /var/www/html
COPY --from=go /sidecar-manager/sidecar-manager /
COPY ./nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY ./startup.sh /
USER root
RUN apk add coreutils
USER nobody
EXPOSE 3000

CMD ["/startup.sh"]

HEALTHCHECK --timeout=10s CMD curl --silent --fail http://127.0.0.1:3000/spec