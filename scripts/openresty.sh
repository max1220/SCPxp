#!/bin/bash
set -e
function LOG() { echo -e "\e[32m$@\e[0m"; }

# Installs and configures a openresty(nginx) server.
# Use on Debian 10.

### CONFIGURATION ###

# domains to generate a default config for
DOMAINS="example.com"

### END CONFIGURATION ###

# add openresty repository
apt-get -y install --no-install-recommends wget gnupg2 ca-certificates
wget -O - https://openresty.org/package/pubkey.gpg | apt-key add -
echo "deb http://openresty.org/package/debian buster openresty" > /etc/apt/sources.list.d/openresty.list

# install openresty
apt update -y
apt install -y openresty openresty-resty

# install new nginx config
cp /etc/openresty/nginx.conf /etc/openresty/nginx.conf.orig
cat << EOF > /etc/openresty/nginx.conf
user www-data;
worker_processes auto;
worker_rlimit_nofile 2048;

events {
	worker_connections 1024;
}

http {
	# log to syslog(forwards to journald)
	access_log syslog:server=unix:/dev/log;
	error_log syslog:server=unix:/dev/log;

	include mime.types;
	default_type application/octet-stream;

	# enable compression for content > 1000 bytes
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
	keepalive_timeout 25;
	client_body_timeout 12;
	client_header_timeout 4;

	ssl_session_cache shared:SSL:10m;
	ssl_session_timeout 10m;

	index index.html;

	# Don't allow embedding from other sites
	add_header X-Frame-Options SAMEORIGIN;

	# only allow HTTPS for the next year(prevent downgrade/mitm)
	add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

	# XSS protections(is this really still needed?)
	add_header X-XSS-Protection "1; mode=block";
	add_header X-Content-Type-Options "nosniff";

	# include the server directives from the sites/ directory
	include /etc/openresty/sites/*.conf;
}
EOF

# create config directory for multiple server entries(vhosts)
mkdir -p /etc/openresty/sites

# create disabled redirect http to https config
cat << EOF > /etc/openresty/sites/http_redirect.conf.disabled
# redirect http to https
server {
listen 80 default_server;
listen [::]:80 default_server;

server_name www.${domainname} ${domainname};
expires 365d;
return 301 https://\$host\$request_uri;
}
EOF

# generate a server entry config file for a domain(vhost)
function add_domain() {
	domainname="${1}"

	# create subdirectory for this domain
	mkdir -p /var/www/${domainname}

	# create hello world index file
	echo "<h1>Hello World from ${domainname}!</h1>" > /var/www/${domainname}/index.html

	# default config for http(enabled)
	cat << EOF > /etc/openresty/sites/${domainname}.http.conf
server {
	listen 80;
	listen [::]:80;

	server_name www.${domainname} ${domainname};
	expires 30d;
	root /var/www/${domainname};
}
EOF

	# default config for https using letsencrypt(disabled)
	cat << EOF > /etc/openresty/sites/${domainname}.https.conf.disabled
server {
	listen 443 ssl http2;
	listen [::]:443 ssl http2;

	ssl_certificate /etc/letsencrypt/live/${domainname}/fullchain.pem;
	ssl_certificate_key /etc/letsencrypt/live/${domainname}/privkey.pem;
	ssl_session_cache shared:SSL:10m;
	ssl_session_timeout 1d;
	ssl_session_tickets off;

	ssl_protocols TLSv1.3;
	ssl_prefer_server_ciphers off;
	add_header Strict-Transport-Security "max-age=31536000" always;
	ssl_stapling on;
	ssl_stapling_verify on;
	ssl_trusted_certificate /etc/letsencrypt/live/${domainname}/chain.pem;

	server_name www.${domainname} ${domainname};
	expires 30d;
	root /var/www/${domainname};
}
EOF

}

# add all domains
for domainname in ${DOMAINS}; do
	LOG "Adding setup for domain ${domainname}"
	add_domain ${domainname}
done

systemctl stop openresty

# remove old directories with wrong permissions
rm -rf /usr/local/openresty/nginx/*_temp

# enable openresty at bootup & start openresty
systemctl enable openresty
systemctl restart openresty

LOG
LOG "openresty setup done!"
LOG
#echo "(press enter to return)"
#read
