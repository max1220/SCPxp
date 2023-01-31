#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/../../..

. utils/cgi.sh
. utils/template.sh
. /etc/os-release

[ "${REQUEST_METHOD}" = "GET" ] || exit_with_status_message "405" "Method not allowed"

read -r loadavg_1 loadavg_5 loadavg_15 rest < /proc/loadavg
read -r pre mem_total_kb rest < /proc/meminfo


mem_total_kb="$(grep -F "MemTotal" /proc/meminfo | cut -d: -f 2)"
mem_free_kb="$(grep -F "MemFree" /proc/meminfo | cut -d: -f 2)"
cpu_model="$(grep -F "model name" /proc/cpuinfo | head -n1 | cut -d: -f 2)"

echo -e "Content-type: text/html\n"
template_eval www/templates/xp/info.template.html
