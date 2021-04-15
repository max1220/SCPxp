#!/bin/bash
set -e

# Use in a Debian 10 container.

apt-get -y install --no-install-recommends wget gnupg ca-certificates
wget -O - https://openresty.org/package/pubkey.gpg | apt-key add -
echo "deb http://openresty.org/package/debian buster openresty" > /etc/apt/sources.list.d/openresty.list

apt update -y
apt install -y openresty openresty-resty

mkdir /var/www
echo '<h1>Hello World!</h1>' > /var/www/index.html

cp /etc/openresty/nginx.conf /etc/openresty/nginx.conf.orig
cat << EOF > /etc/openresty/nginx.conf
user www-data;
worker_processes auto;
worker_rlimit_nofile 2048;

events {
    worker_connections 1024;
}

http {
    access_log syslog:server=unix:/dev/log;
    error_log syslog:server=unix:/dev/log;

    include mime.types;
    default_type application/octet-stream;

    gzip on;
    gzip_min_length 1000;
    gzip_http_version 1.1;
    gzip_types text/html;
    gzip_types text/plain;
    gzip_types text/css;
    gzip_types application/javascript;
    gzip_types application/json;
    gzip_types image/svg+xml;

    sendfile on;
    keepalive_timeout 65;
    client_body_timeout 12;
    client_header_timeout 4;

    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    index index.html;

    # redirect http to https:
    #server {
    #    listen 80 default_server;
    #    listen [::]:80 default_server;
    #    server_name www.example.com example.com;
    #    return 301 https://\$host\$request_uri;
    #}

    server {
        listen 80;
        listen [::]:80;

        # Enable https support:
        #listen 443 ssl http2;
        #listen [::]:443 ssl http2;

        #ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
        #ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
        #ssl_session_cache shared:SSL:10m;
        #ssl_session_timeout 1d;
        #ssl_session_tickets off;

        #ssl_protocols TLSv1.3;
        #ssl_prefer_server_ciphers off;
        #add_header Strict-Transport-Security "max-age=63072000" always;
        #ssl_stapling on;
        #ssl_stapling_verify on;
        #ssl_trusted_certificate /etc/letsencrypt/live/example.com/chain.pem;

        server_name www.example.com example.com;
        root /var/www;
		# proxy example:
        #location /sub/ {
        #    proxy_pass http://10.0.3.47:80/sub/;
        #}
    }
}
EOF
systemctl enable openresty
systemctl restart openresty

echo
echo
echo "Container setup ok!"
echo
#echo "(press enter to return)"
#read
