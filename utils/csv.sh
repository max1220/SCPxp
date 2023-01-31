
# utillity functions for working with CSV files,
# mostly in the monitor application.
# requires get_timestamp from utils/timestamp.sh

# Only keep the last max_lines($2) lines of the CSV file($1)
function csv_prune_lines() {
	local file="${1}" max_lines="${2}"
	tail -n "${max_lines}" "${file}" > "${file}.pruned"
	mv "${file}.pruned" "${file}"
}

# Only keep samples of the last max_age($2) seconds of the CSV file($1)
# first value of each csv needs to be a timestamp
function csv_prune_age() {
	local file="${1}" max_age="${2}" current_time min_time
	current_time="$(get_timestamp)"
	min_time="$((current_time-max_age))"
	while IFS="," read -r sample_time sample_value; do
		if [ "${sample_time}" -ge "${min_time}" ]; then
			echo "${sample_time},${sample_value}"
		fi
	done < "${file}" > "${file}.pruned"
	mv "${file}.pruned" "${file}"
}

# read lines from stdin, add a timestamps, output to stdout
function csv_add_timestamps() {
	while read -r line; do
		echo "$(get_timestamp),${line}"
	done
}

# append lines from stdin to the file $1
# ("line-by-line", without leaving an fd open)
function append_lines_to_file() {
	local file="${1}"
	while read -r line; do
		echo "${line}" >> "${file}"
	done
}

# add timestamps to each line in stdout, then append lines to a logfile($1).
function monitor_log_writer() {
	csv_add_timestamps | append_lines_to_file "${1}"
}
