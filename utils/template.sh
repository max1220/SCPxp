
# very simple template engine using heredoc and eval.
# WARNING: Be very careful with user-supplied data in these templates,
# they are just shell scripts after all!

# this helper function adds a cat << EOF like prefix/postfix to stdin
function templatize() {
	local my_heredoc_str="EOF_${RANDOM}_EOF"
	echo "cat << ${my_heredoc_str}"
	cat
	echo "${my_heredoc_str}"
}

# run the template specified by $1 using eval/herestring
function template_eval() {
	local template_path="${1}"
	shift
	eval "$(templatize < "${template_path}")"
}

# slightly safer version using envsubst from gettext
function template_envsubst() {
	local template_path="${1}"
	shift
	envsubst < "${template_path}"
}
