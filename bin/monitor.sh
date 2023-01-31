#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/..

. utils/csv.sh

MONITOR_DELAY=1

# monitor event loop
while sleep "${MONITOR_DELAY}"; do
	true;
done
