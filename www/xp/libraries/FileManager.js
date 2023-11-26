"use strict";

function FileManager(cgi_commands) {

	// create functions for testing file attributes, using the test shell command.
	function test_wrapper(test_cmd) {
		return function(path) {
			let resp = cgi_commands.run_command_sync([ "eval", "[", test_cmd, cgi_commands.escape_shell_arg(path), "]", "&&", "echo true" ])
			if (resp && resp.trim()=="true") {
				return true
			}
		}
	}
	this.test = {
		block: test_wrapper("-b"),
		character: test_wrapper("-c"),
		directory: test_wrapper("-d"),
		exists: test_wrapper("-e"),
		file: test_wrapper("-f"),
		setgid: test_wrapper("-g"),
		group: test_wrapper("-G"),
		symlink: test_wrapper("-h"),
		sticky: test_wrapper("-k"),
		modified: test_wrapper("-N"),
		user: test_wrapper("-O"),
		pipe: test_wrapper("-p"),
		read: test_wrapper("-r"),
		size: test_wrapper("-s"),
		socket: test_wrapper("-S"),
		terminal: test_wrapper("-t"),
		setuid: test_wrapper("-u"),
		write: test_wrapper("-w"),
		execute: test_wrapper("-x"),
	}

	// return the basename of the specified path
	this.basename = function(path) {
		return path.split("/").pop()
	}

	// return the containing directory
	this.basedir = function(path) {
		let base_path = path.split("/").slice(0,-1).join("/")
		return (base_path=="") ? "/" : base_path
	}

	// copy(duplicate) files/directories
	this.copy_command = function(source_paths, target_path, recursive) {
		let copy_command = [ "cp", recursive ? "-rv" : "-v"]
		copy_command = copy_command.concat(source_paths)
		copy_command.push(target_path)
		return copy_command
	}
	this.copy = function(source_paths, target_path, recursive, ret_cb, stdout_cb) {
		if (!this.test.directory(target_path)) { return; }
		let copy_command = this.copy_command(source_paths, target_path, recursive)
		return cgi_commands.run_command_event_stream(stdout_cb, ret_cb, undefined, undefined, copy_command, undefined, true)
	}

	// move(rename) files/directories
	this.move_command = function(source_paths, target_path) {
		let move_command = [ "mv", "-vf" ]
		move_command = move_command.concat(source_paths)
		move_command.push(target_path)
		return move_command
	}
	this.move = function(source_paths, target_path, ret_cb, stdout_cb) {
		let move_command = this.move_command(source_paths, target_path)
		return cgi_commands.run_command_event_stream(stdout_cb, ret_cb, undefined, undefined, move_command, undefined, true)
	}

	// remove(delete) files/directories
	this.remove_command = function(target_paths, recursive) {
		let remove_command = [ "rm", recursive ? "-rv" : "-v" ]
		remove_command = remove_command.concat(target_paths)
		return remove_command
	}
	this.remove = function(target_paths, recursive, ret_cb, stdout_cb) {
		let remove_command = this.remove_command(target_paths, recursive)
		return cgi_commands.run_command_event_stream(stdout_cb, ret_cb, undefined, undefined, remove_command, undefined, true)
	}

	// chmod(change file mode bits) on files/directories
	this.chmod_command = function(target_paths, mode_str, recursive) {
		let chmod_command = [ "chmod", recursive ? "-Rvc" : "-vc", mode_str]
		chmod_command = chmod_command.concat(target_paths)
		return chmod_command
	}
	this.chmod = function(target_paths, mode_str, recursive, ret_cb, stdout_cb) {
		let chmod_command = this.chmod_command(target_paths, mode_str, recursive)
		return cgi_commands.run_command_event_stream(stdout_cb, ret_cb, undefined, undefined, chmod_command, undefined, true)
	}

	// create a directory(mkdir)
	this.mkdir = function(target_path) {
		let mkdir_command = [ "mkdir", "-vp", target_path ]
		return cgi_commands.run_command_sync(mkdir_command, undefined, undefined, undefined, undefined, true)
	}

	// update modification/access time or create file
	this.touch = function(target_path) {
		let touch_command = [ "touch", target_path ]
		return cgi_commands.run_command_sync(touch_command, undefined, undefined, undefined, undefined, true)
	}

	// list the files in the specified directory
	this.list = function(target_path, max_depth, dironly, show_hidden, humanreadable, sort, reverse, dirsfirst) {
		if (sort && (!["ctime", "mtime", "size"].includes(sort))) { return; }
		if (!this.test.directory(target_path)) { return; }
		let list_command = [ "tree", "-Jfpugs", "--noreport", target_path ]
		if (max_depth) { list_command.push("-L", max_depth) }
		if (dironly) { list_command.push("-d"); }
		if (show_hidden) { list_command.push("-a"); }
		if (humanreadable) { list_command.push("-h"); }
		if (sort) { list_command.push("--sort", sort); }
		if (reverse) { list_command.push("-r"); }
		if (dirsfirst) { list_command.push("--dirsfirst"); }
		let files_json = cgi_commands.run_command_sync(list_command, "application/json")
		let files_obj = JSON.parse(files_json)
		return files_obj[0]
	}

	// generate a download URL for a file
	this.enc_download = function(target_path) {
		if (!this.test.file(target_path)) { return; }
		let filename = "\"" + this.basename(target_path).replaceAll("\"", "\\\"") + "\""
		return cgi_commands.encode_command(
			[ "cat", target_path ],
			"application/octet-stream",
			[ "Content-Disposition: attachment; filename="+filename ]
		)
	}

	// generate a download URL for a tarball of directories/files
	this.enc_download_tar = function(target_paths) {
		let tar_command = [ "tar", "-cf", "-", "--" ].concat(target_paths)
		return cgi_commands.base_url(cgi_commands.encode_command(
			tar_command,
			"application/octet-stream",
			[ "Content-Disposition: attachment; filename=\"archive.tar\"" ]
		))
	}

	// get a URL to read a file with the specified content_type
	this.enc_read_file = function(target_path, content_type) {
		let cmd = cgi_commands.encode_command(
			["cat", target_path],
			content_type ? content_type : "application/octet-stream"
		)
		return cgi_commands.base_url(cmd)
	}

	// upload content_base64 and save base64-decoded in target_file_path,
	// call cb on success
	this.upload_file_base64 = function(content_base64, target_file_path, cb, progress_cb) {
		let enc_cmd = cgi_commands.encode_command(["eval", "base64", "-d", "-", ">", target_file_path], undefined, undefined, undefined, undefined, true)
		return cgi_commands.run_encoded_async(enc_cmd, cb, content_base64, progress_cb)
	}

	// from a file_type index, return a preview_url_gen function.
	// this function returns a preview URL for a file path.
	this.file_type_to_preview_url_gen = {
		text: function(path) {
			let cmd = cgi_commands.encode_command(["head -n3", path], "text/plain")
			return cgi_commands.base_url() + "?" + cmd
		},
		markdown: function(path) {
			let cmd = cgi_commands.encode_command(["markdown-it", path], "text/html")
			return cgi_commands.base_url() + "?" + cmd
		},
		/*
		image: function(path) {
			let cmd = cgi_commands.encode_command(["ffmpeg", "-i", path, "-vf", "scale=64:64", "-c:v", "png", "-f", "image2pipe", "-"], "image/png")
			return cgi_commands.base_url() + "?" + cmd
		},
		video: function(path) {
			let cmd = cgi_commands.encode_command(["ffmpeg", "-ss", "00:01:30", "-i", path, "-vf", "scale=64:64", "-c:v", "png", "-frames:v", "1", "-f", "image2pipe", "-"], "image/png")
			return cgi_commands.base_url() + "?" + cmd
		},
		*/
	}

	// from a file_type index, return an icon name
	this.file_type_to_icon = {
		text: "file-text",
		markdown: "file-text",
		image: "file-image",
		video: "file-video",
		web: "file-web",
		script: "file-script",
		directory: "file-directory",
		symlink: "file-symlink",
		file: "file-generic",
	}

	// from a file_type index, return a open_url_gen function.
	// this function returns an URL to open the file path in an application.
	this.file_type_to_open_url_gen = {
		text: function(path) {
			return "/xp/applications/text_editor/text_editor.html#file_path="+encodeURIComponent(path)
		},
		markdown: function(path) {
			return "/xp/applications/text_editor/text_editor.html#file_path="+encodeURIComponent(path)
		},
		image: function(path) {
			return "/xp/applications/picture_viewer/picture_viewer.html#file_path="+encodeURIComponent(path)
		},
		video: function(path) {
			return "/xp/applications/video_viewer/video_viewer.html#file_path="+encodeURIComponent(path)
		},
		web: function(path) {
			return "/xp/applications/text_editor/text_editor.html#file_path="+encodeURIComponent(path)
		},
		script: function(path) {
			//return "/xp/applications/run/run_output?merge_stderr=on&mode=lines&command_str="+encodeURIComponent(path)
			return "/xp/applications/text_editor/text_editor.html#file_path="+encodeURIComponent(path)
		}
	}

	// list of known file extensions and how to generate a URL for them
	this.file_extension_to_file_type = {
		txt: "text",
		conf: "text",
		md: "markdown",
		jpg: "image",
		jpeg: "image",
		gif: "image",
		png: "image",
		svg: "image",
		webm: "video",
		m4v: "video",
		mkv: "video",
		mp4: "video",
		htm: "web",
		html: "web",
		sh: "script",
		bash: "script"
	}

	this.path_to_file_type = function(target_path) {
		let file_extension = target_path.split(".").pop()
		let file_type = this.file_extension_to_file_type[file_extension]
		return file_type
	}

	// try to guess the correct URL handler for the specified target_path
	// this is an application link that opens the target_path if possible,
	// or a link that downloads the file/directory.
	this.url_for = function(target_path) {
		let file_type = this.path_to_file_type(target_path)
		if (this.test.directory(target_path)) {
			// target_path is a directory
			return cgi_commands.base_url() + "?" + this.enc_download_tar([ target_path ])
		} else if (file_type) {
			// target_path is a file with known extension
			let open_url_gen = this.file_type_to_open_url_gen[file_type]
			if (open_url_gen) {
				return open_url_gen(target_path)
			}
		}
		if (this.test.file(target_path)) {
			return cgi_commands.base_url() + "?" + this.enc_download(target_path)
		}
	}
}
