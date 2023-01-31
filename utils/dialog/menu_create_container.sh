
# external funcs_:
#confirm_exec

# the container creation "wizard"
function menu_create_container() {
	local container template template_args
	container="$(inputbox "Please enter a name for the new container:")"
	[ "${container}" = "" ] && return 1;
	template="$(inputbox "Enter the LXC template to use:" "${DEFAULT_LXC_TEMPLATE}")"
	[ "${template}" = "" ] && return 1;
	template_args="$(inputbox "Extra arguments for template:" "${DEFAULT_LXC_TEMPLATE_ARGS}")"
	[ "${template_args}" = "" ] && return 1;
	# shellcheck disable=SC2086 # Intentionally splitting template_args
	lxc_create_container "${container}" "${template}" ${template_args}
	if yesno "Start container now?"; then
		local post_install_script
		lxc_start_container "${container}"
		post_install_script="$(inputbox "Run post-install script?" "${DEFAULT_POST_INSTALL_SCRIPT}")"
		if [ "${post_install_script}" != "" ]; then
			lxc_run_script_in_container "${container}" "${post_install_script}"
		fi
	fi
}
