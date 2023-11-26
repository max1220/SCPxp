"use strict";

let cgi_commands = new CgiCommands(CGI_BACKEND)
let file_manager = new FileManager(cgi_commands)
let message_box = new MessageBox()

function video_url_from_file_path(file_path) {
	let f = file_path.toLowerCase()
	let content_type
	if (f.endsWith(".webm") || f.endsWith(".mkv")) {
		content_type = "video/webm"
	} else if (f.endsWith(".mp4") || f.endsWith(".m4v")) {
		content_type = "video/mp4"
	}
	if (content_type) {
		let file_url = file_manager.enc_read_file(file_path, content_type)
		return file_url
	}
}
function show_video_url(video_url) {
	console.log("loading video url:",video_url)
	HASH_PARMS.file_path = undefined
	HASH_PARMS.url = video_url
	HTML_ELEM.video.src = video_url
	HTML_ELEM.video.children[0].src = video_url
}
function show_video_file_path(file_path) {
	console.log("loading video file:",file_path)
	show_video_url(video_url_from_file_path(file_path))
	HASH_PARMS.file_path = file_path
	HASH_PARMS.url = undefined
}

function btn_open_file() {
	message_box.show_message_box_file({
		show_only_file_types: "video",
		filename_required: true,
	}, function(ret) {
		if (ret[0]=="confirm") {
			show_video_file_path(ret[1])
		}
	})
}

function btn_open_url() {
	message_box.show_message_box_input({
		main_text: "",
		win_size: "300x150",
		win_title: "Enter video URL:",
		text_label: "URL:",
		show_only_file_types: "video",
	}, function(ret) {
		if (ret[0]=="confirm") {
			show_video_url(ret[1])
		}
	})
}

function btn_refresh() {
	location.reload()
}

function btn_next() {
	if (!HASH_PARMS.file_path) { return; }
	let basedir = file_manager.basedir(HASH_PARMS.file_path)
	let list = file_manager.list(basedir)
	list.contents = list.contents.filter(function(e) {
		if (e.type!=="file") { return; }
		if (video_url_from_file_path(e.name)) { return true; }
	})

	let self_index = list.contents.findIndex(function(e) { return e.name==HASH_PARMS.file_path })
	if (self_index == -1) { return; }
	let next_index = self_index + 1
	if (next_index==list.contents.length) {
		next_index = 0
	}
	let next_file_path = list.contents[next_index].name
	show_video_file_path(next_file_path)
}
function btn_previous() {
	if (!HASH_PARMS.file_path) { return; }
	let basedir = file_manager.basedir(HASH_PARMS.file_path)
	let list = file_manager.list(basedir)
	list.contents = list.contents.filter(function(e) {
		if (e.type!=="file") { return; }
		if (video_url_from_file_path(e.name)) { return true; }
	})
	let self_index = list.contents.findIndex(function(e) { return e.name==HASH_PARMS.file_path })
	if (self_index == -1) { return; }
	let previous_index = self_index - 1
	if (previous_index==-1) {
		previous_index = list.contents.length - 1
	}
	let previous_file_path = list.contents[previous_index].name
	show_video_file_path(previous_file_path)
}


function btn_about() {
	message_box.show_message_box_info({
		win_icon: "application-video-viewer",
		win_size: "300x250",
		win_title: "About Video Viewer",
		title_text: "About Video Viewer",
		title_icon: "application-video-viewer",
		main_html: `
		A simple video viewer.
		<ul>
			<li>generic CGI backend written in Bash</li>
			<li>front-end written in vanilla javascript</li>
		</ul>
		`,
		okay_button: "Close",
		greyout: false,
	})
}
function btn_info() {
	if (!HASH_PARMS.file_path) { return; }
	message_box.show_message_box_command({
		command_str: cgi_commands.escape_shell_args([
			"ffprobe",
			"-v",
			"error",
			"-show_format",
			"-show_streams",
			HASH_PARMS.file_path
		])
	})
}




function win_load() {
	win.title = "Video viewer"
	win.icon = "application-video-viewer"
	win.resize(640, 400)
	win.update()
}
function body_onload() {
	if (HASH_PARMS.file_path) {
		show_video_file_path(HASH_PARMS.file_path)
	} else if (HASH_PARMS.url) {
		show_video_url(HASH_PARMS.url)
	}
}




