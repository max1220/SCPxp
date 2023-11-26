default_desktop_icons = [
	{
		make_new_win: true,
		href: "/xp/applications/l1t/l1t.html",
		icon: "application-l1t",
		text: "L1T"
	},
	{
		make_new_win: true,
		href: "/xp/applications/text_editor/text_editor.html",
		icon: "application-text-editor",
		text: "Text editor"
	},
	{
		make_new_win: true,
		href: "/xp/applications/file_manager/file_manager.html#tree_path=HOME",
		icon: "application-file-manager",
		text: "Home"
	},
	{
		make_new_win: true,
		href: "/xp/applications/message_box/message_box.html",
		icon: "generic-info",
		text: "Message box"
	},
	{
		make_new_win: true,
		href: "/xp/tests/tabs.html",
		icon: "generic-info",
		text: "Tabs"
	},
	{
		make_new_win: true,
		href: "/xp/tests/windowbars.html",
		icon: "generic-info",
		text: "windowbars"
	},
	{
		make_new_win: true,
		href: "/xp/applications/terminal/terminal.html",
		icon: "application-terminal",
		text: "Terminal"
	},
	{
		make_new_win: true,
		href: "/xp/applications/picture_viewer/picture_viewer.html",
		icon: "application-picture-viewer",
		text: "Picture viewer"
	},
	{
		make_new_win: true,
		href: "/xp/applications/video_viewer/video_viewer.html",
		icon: "application-video-viewer",
		text: "Video viewer"
	},
	{
		make_new_win: true,
		href: "/xp/applications/FreeDOS/FreeDOS.html",
		icon: "application-freedos",
		text: "FreeDOS"
	},
	{
		make_new_win: true,
		href: "/xp/applications/browser/browser.html",
		icon: "application-browser",
		text: "Browser"
	},
	{
		make_new_win: true,
		href: "/xp/applications/system_info/system_info.html",
		icon: "application-system-info",
		text: "System info"
	},
	{
		make_new_win: true,
		href: "/xp/applications/x11_streamer/x11_streamer.html",
		icon: "application-x11-streamer",
		text: "X11 streamer"
	},
	{
		make_new_win: true,
		href: "/xp/applications/run/run_dialog.html",
		icon: "application-run",
		text: "Run dialog"
	},
]

DESKTOP_ICONS = default_desktop_icons

let desktop_icons_json = localStorage.getItem("XP_DESKTOP_ICONS")
if (desktop_icons_json) {
	DESKTOP_ICONS = JSON.parse(desktop_icons_json)
}
