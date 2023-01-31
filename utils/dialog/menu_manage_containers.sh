

# the main menu
function menu_manage_containers() {
	# generate the containers part of the menu
	local containers_menu=( "" "Containers:" )
	for running_container in $(lxc_list_running); do
		containers_menu+=("${running_container}" "(running)")
	done
	for stopped_container in $(lxc_list_stopped); do
		containers_menu+=("${stopped_container}" "(stopped)")
	done

	# show the menu, let the user select a container or action
	local selected
	selected="$(menu "Manage containers - Main menu" \
		"create" "Create a new container" \
		"restore" "Restore a container from backup" \
		"${containers_menu[@]}"
	)"

	# handle user selection
	if [ "${selected}" = "create" ]; then
		menu_create_container || true
	elif [ "${selected}" = "restore" ]; then
		menu_restore_container || true
	elif lxc_is_running "${selected}"; then
		while menu_running_container "${selected}"; do true; done;
	elif lxc_is_stopped "${selected}"; then
		while menu_stopped_container "${selected}"; do true; done;
	else
		return 1
	fi
}
