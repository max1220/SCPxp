"use strict";

let cgi_commands = new CgiCommands(CGI_BACKEND)
let file_manager = new FileManager(cgi_commands)
let message_box = new MessageBox()

function image_url_from_file_path(file_path) {
	let f = file_path.toLowerCase()
	let content_type
	if (f.endsWith(".jpg") || f.endsWith(".jpeg")) {
		content_type = "image/jpeg"
	} else if (f.endsWith(".gif")) {
		content_type = "image/gif"
	} else if (f.endsWith(".png")) {
		content_type = "image/png"
	} else if (f.endsWith(".svg")) {
		content_type = "image/svg+xml"
	}
	if (content_type) {
		return file_manager.enc_read_file(file_path, content_type)
	}
}
function show_image_url(image_url) {
	console.log("loading image url:",image_url)
	HASH_PARMS.file_path = undefined
	HASH_PARMS.url = image_url
	HTML_ELEM.image.src = image_url
}
function show_image_file_path(file_path) {
	show_image_url(image_url_from_file_path(file_path))
	HASH_PARMS.file_path = file_path
	HASH_PARMS.url = undefined
}

function btn_open_file() {
	message_box.show_message_box_file({
		show_only_file_types: "image",
		filename_required: true,
	}, function(ret) {
		if (ret[0]=="confirm") {
			show_image_file_path(ret[1])
		}
	})
}

function btn_open_url() {
	message_box.show_message_box_input({
		main_text: "",
		win_size: "300x150",
		win_title: "Enter image URL:",
		text_label: "URL:",
		show_only_file_types: "image",
	}, function(ret) {
		if (ret[0]=="confirm") {
			show_image_url(ret[1])
		}
	})
}

function msgbox_save_as(cb) {
	message_box.show_message_box_file({
		win_title: "Save file...",
		main_text: "Please select the file path to save the image as.\nThe file format is automatically determined by the file extension.",
		filename_required: true,
		confirm_button: "Save"
	}, cb)
}

function btn_refresh() {
	location.reload()
}

function btn_convert() {
	if (!HASH_PARMS.file_path) { return; }

	msgbox_save_as(function(ret) {
		if (ret[0] !== "confirm") { return; }
		let save_file_path = ret[1]
		message_box.show_message_box_command({
			command_str: cgi_commands.escape_shell_args([
				"convert",
				HASH_PARMS.file_path,
				save_file_path
			])
		}, function(ret) {
			if ((ret[0]!=="confirm") || (ret[1] !== 0)) { return; }
			show_image_file_path(save_file_path)
		})
	})
}

function btn_resize() {
	if (!HASH_PARMS.file_path) { return; }

	message_box.show_message_box_input({
		win_title: "Enter new size",
		win_size: "300x200",
		main_text: "Please enter the new dimensions of the image.\nYou can specify a dimension(e.g. 1920x1080) or a percentage(e.g. 50%)"
	}, function(ret) {
		if (ret[0] !== "confirm") { return; }
		let resize_str = ret[1]
		msgbox_save_as(function(ret) {
			if (ret[0] !== "confirm") { return; }
			let save_file_path = ret[1]
			message_box.show_message_box_command({
				command_str: cgi_commands.escape_shell_args([
					"convert",
					HASH_PARMS.file_path,
					"-resize",
					resize_str,
					save_file_path
				])
			}, function(ret) {
				if ((ret[0]!=="confirm") || (ret[1] !== 0)) { return; }
				show_image_file_path(save_file_path)
			})
		})
	})
}

function btn_rotate(ccw) {
	if (!HASH_PARMS.file_path) { return; }

	msgbox_save_as(function(ret) {
		if (ret[0] !== "confirm") { return; }
		let save_file_path = ret[1]
		message_box.show_message_box_command({
			command_str: cgi_commands.escape_shell_args([
				"convert",
				HASH_PARMS.file_path,
				"-rotate",
				ccw ? "-90" : "90",
				save_file_path
			])
		}, function(ret) {
			if ((ret[0]!=="confirm") || (ret[1] !== 0)) { return; }
			show_image_file_path(save_file_path)
		})
	})
}

function btn_next() {
	if (!HASH_PARMS.file_path) { return; }
	let basedir = file_manager.basedir(HASH_PARMS.file_path)
	let list = file_manager.list(basedir)
	list.contents = list.contents.filter(function(e) {
		if (e.type!=="file") { return; }
		if (image_url_from_file_path(e.name)) { return true; }
	})

	let self_index = list.contents.findIndex(function(e) { return e.name==HASH_PARMS.file_path })
	if (self_index == -1) { return; }
	let next_index = self_index + 1
	if (next_index==list.contents.length) {
		next_index = 0
	}
	let next_file_path = list.contents[next_index].name
	show_image_file_path(next_file_path)
}
function btn_previous() {
	if (!HASH_PARMS.file_path) { return; }
	let basedir = file_manager.basedir(HASH_PARMS.file_path)
	let list = file_manager.list(basedir)
	list.contents = list.contents.filter(function(e) {
		if (e.type!=="file") { return; }
		if (image_url_from_file_path(e.name)) { return true; }
	})
	let self_index = list.contents.findIndex(function(e) { return e.name==HASH_PARMS.file_path })
	if (self_index == -1) { return; }
	let previous_index = self_index - 1
	if (previous_index==-1) {
		previous_index = list.contents.length - 1
	}
	let previous_file_path = list.contents[previous_index].name
	show_image_file_path(previous_file_path)
}


function btn_about() {
	message_box.show_message_box_info({
		win_icon: "application-picture-viewer",
		win_size: "300x250",
		win_title: "About Picture Viewer",
		title_text: "About Picture Viewer",
		title_icon: "application-picture-viewer",
		main_html: `
		A simple picture viewer.
		<ul>
			<li>generic CGI backend written in Bash</li>
			<li>front-end written in vanilla javascript</li>
			<li>uses ImageMagick for converting/rotating</li>
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
			"identify",
			"-verbose",
			HASH_PARMS.file_path
		])
	})
}
function btn_scale(n) {
	if (n === undefined) {
		HTML_ELEM.image.style.width = "100%"
		HTML_ELEM.image.style.height = "100%"
	} else if (n==1) {
		HTML_ELEM.image.style.width = ""
		HTML_ELEM.image.style.height = ""
	} else {
		HTML_ELEM.image.style.width = HTML_ELEM.image.naturalWidth*n+"px"
		HTML_ELEM.image.style.height = HTML_ELEM.image.naturalHeight*n+"px"
	}
}
function btn_bg_black() {
	document.body.style.backgroundColor = "#000"
}
function btn_bg_white() {
	document.body.style.backgroundColor = "#fff"
}



function win_load() {
	win.title = "Picture viewer"
	win.icon = "application-picture-viewer"
	win.resize(640, 400)
	win.update()
}
function body_onload() {
	if (HASH_PARMS.file_path) {
		show_image_file_path(HASH_PARMS.file_path)
	} else if (HASH_PARMS.url) {
		show_image_url(HASH_PARMS.url)
	}
}

