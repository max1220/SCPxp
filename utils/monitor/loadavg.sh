function monitor_loadavg() {
	local delay="${1}"
	while sleep "${delay}"; do
		read -r loadavg rest < /proc/loadavg
		echo "${loadavg}"
		true;
	done | csv_add_timestamps
}
