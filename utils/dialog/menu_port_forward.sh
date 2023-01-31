

# Menu for creating a port forward for a container.
# $1 is the container name
function menu_port_forward() {
	local container="${1}" container_port wan_interface host_port container_ip iptables_rule

	container_port="$(inputbox "Please enter the port in the container:")"
	[ "${container_port}" = "" ] && return 1;
	wan_interface="$(inputbox "Please enter the name of the WAN interaface on the host:")"
	[ "${wan_interface}" = "" ] && return 1;
	host_port="$(inputbox "Please enter the port on the host:")"
	[ "${host_port}" = "" ] && return 1;
	container_ip="$(lxc_get_container_ip "${container}")"
	[ "${container_ip}" = "" ] && return 1;

	iptables_rule="$(generate_port_forward_for_ip "${wan_interface}" "${host_port}" "${container_ip}" "${container_port}")"
	[ "${iptables_rule}" = "" ] && return 1;

	if yesno "Generated iptable rule:\n\n${iptables_rule}\n\nApply now?"; then
		confirm_exec "${iptables_rule}"
	fi
}
