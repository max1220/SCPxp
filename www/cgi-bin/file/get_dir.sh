#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"/../../..

. utils/cgi.sh

# this script returns directory contents as JSON.

# only GET allowed
[ "${REQUEST_METHOD}" = "GET" ] || exit_with_status_message "405" "Method not allowed"

# get the $query_parms_arr array from URL
parse_query_parms_list "${QUERY_STRING}"
# parse into array and URL-decode
parse_query_parms_arr true

# get the filepath argument
file_path="${query_parms_arr[file_path]:-}"
[ "${file_path}" = "" ] && exit_with_status_message "400" "Bad request"

# check that $file_path is a directory
[ -d "${file_path}" -a -r "${file_path}" ] || exit_with_status_message "400" "Bad request"

# get the maximum depth argument
max_depth_arg=""
max_depth="${query_parms_arr[max_depth]:-}"
if [ "${max_depth}" -eq "${max_depth}" ]; then
	# max_depth is number, add to arguments
	max_depth_arg="-L ${max_depth}"
elif ! [ "${max_depth}" = "" ]; then
	# max_depth is specified, but not a number
	exit_with_status_message "400" "Bad request"
fi

# get the sorting arguments
sort_args=""
if ! [ "${query_parms_arr[sort]:-}" = "" ]; then
	case "${query_parms_arr[sort]:-}" in
		modification)
			sort_args="--sort=mtime"
			;;
		creation)
			sort_args="--sort=ctime"
			;;
		size)
			sort_args="--sort=size"
			;;
		*)
			# specified but invalid
			exit_with_status_message "400" "Bad request"
			;;
	esac
fi
[ "${query_parms_arr[reverse]:-}" = "true" ] && sort_args="${sort_args} -r"
[ "${query_parms_arr[dirfirst]:-}" = "true" ] && sort_args="${sort_args} --dirsfirst"

# get extra arguments
extra_args=""
[ "${query_parms_arr[humanreadable]:-}" = "true" ] && extra_args="${extra_args} -h"
[ "${query_parms_arr[dironly]:-}" = "true" ] && extra_args="${extra_args} -d"

# respond with the sorted list of files and directories as JSON
echo "Content-Type: application/json"
echo
tree -Jfpugs $max_depth_arg $sort_args $extra_args -- "${file_path}"
