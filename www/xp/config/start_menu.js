let default_start_menu = [
	/*{
		url: "",
		icon: "application-generic",
		text: "App demo"
	},
	{
		url: "",
		icon: "application-browser",
		text: "Browser"
	},*/
	{
		url: "/xp/desktop.html",
		icon: "application-generic",
		text: "Desktop window"
	},
	{
		url: "/xp/applications/file_manager/file_manager.html",
		icon: "application-file-manager",
		text: "File manager"
	},
	/*{
		url: "",
		icon: "application-freedos",
		text: "FreeDOS prompt"
	},*/
	{
		url: "/xp/applications/l1t/l1t.html",
		icon: "application-l1t",
		text: "L1T"
	},
	/*{
		url: "",
		icon: "application-lxc-manager",
		text: "LXC Manager"
	},
	{
		url: "",
		icon: "application-system-info",
		text: "System info"
	},*/
	{
		url: "",
		icon: "application-terminal",
		text: "Terminal"
	},
	/*{
		url: "",
		icon: "application-x11-manager",
		text: "X11 stream"
	},*/
	{
		url: "",
		icon: "application-text-editor",
		text: "Text editor"
	},
	{
		spacer: true
	},
	{
		url: "",
		icon: "application-settings",
		text: "Settings..."
	},
	{
		url: "/xp/applications/run/run_dialog.html",
		icon: "application-run",
		text: "Run..."
	},
	{
		spacer: true
	},
	{
		url: "/boot.html",
		icon: "startmenu-logout",
		text: "Logout..."
	},
	{
		url: "about:blank",
		icon: "startmenu-shutdown",
		text: "Turn off..."
	},
]

START_MENU = default_start_menu

let start_menu_json = localStorage.getItem("XP_START_MENU")
if (start_menu_json) {
	START_MENU = JSON.parse(start_menu_json)
}
