function FileManager(cgi_commands) {

	// create functions for testing file attributes, using the test shell command.
	function test_wrapper(test_cmd) {
		return function() {
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

	// copy(duplicate) a file/directory
	this.copy function(source_path, target_path, recursive, ret_cb, stdout_cb) {
		if (recursive && !api_is_dir(source_path)) { return; }
		if (!api_is_file(source_path)) { return; }
		if (!api_is_dir(target_path)) { return; }
		let copy_command = [ "cp", recursive ? "-rv" : "-v", source_path, target_path ]
		return cgi_commands.run_command_event_stream(stdout_cb, ret_cb, undefined, undefined, copy_command)
	}

	// move(rename) a file/directory
	this.move = function(source_path, target_path, ret_cb, stdout_cb) {
		let move_command = [ "mv", "-vf", source_path, target_path ]
		return cgi_commands.run_command_event_stream(stdout_cb, ret_cb, undefined, undefined, move_command)
	}

	// delete(remove) a file
	this.remove = function(target_path, recursive, ret_cb, stdout_cb) {
		let remove_command = [ "rm", recursive ? "-rv" : "-v", target_path ]
		return cgi_commands.run_command_event_stream(stdout_cb, ret_cb, undefined, undefined, move_command)
	}

	// create a directory
	this.mkdir = function(target_path) {
		let mkdir_command = [ "mkdir", "-vp", target_dir ]
		return cgi_commands.run_command_sync(mkdir_command)
	}

	// update modification/access time or create file
	this.touch = function(target_path) {
		let touch_command = [ "touch", target_path ]
		return cgi_commands.run_command_sync(touch_command)
	}

	// list the files in the specified directory
	this.list = function(target_path, max_depth, dironly, show_hidden, humanreadable, sort, reverse, dirsfirst) {
		if (sort && (!["ctime", "mtime", "size"].includes(sort))) { return; }
		if (!this.test.directory(target_path)) { return; }
		let list_command = [ "tree", "-Jfpugs", "--noreport", target_dir ]
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
			[ "cat", "target_path" ],
			"application/octet-stream",
			[ "Content-Disposition: attachment; filename="+filename ]
		)
	}

	// generate a download URL for a tarball of directories/files
	this.enc_download_tar(target_paths) {
		let tar_command = [ "tar", "-cf", "-", "--" ].concat(target_paths)
		return cgi_commands.encode_command(
			tar_command,
			"application/octet-stream",
			[ "Content-Disposition: attachment; filename=\"archive.tar\"" ]
		)
	}

	// return a function for a type that gets a URL for an application for the specified file path
	this.file_types = {
		text: function(path) {
			return "/static/html/xp/text_editor.html#"+encodeURIComponent(path)
		}
		image: function(path) {
			return "/static/html/xp/picture_viewer.html#"+encodeURIComponent(path)
		}
		video: function(path) {
			return "/static/html/xp/video_viewer.html#"+encodeURIComponent(path)
		}
		web: function(path) {
			return "/static/html/xp/browser.html#"+encodeURIComponent(path)
		}
		script: function(path) {
			return "/static/html/xp/terminal.html#new-session:"+encodeURIComponent(path)
		}
	}

	// list of known file extensions and how to generate a URL for them
	this.file_extensions = {
		txt: file_type_text,
		conf: file_type_text,

		jpg: file_type_image,
		jpeg: file_type_image,
		gif: file_type_image,
		png: file_type_image,
		svg: file_type_image,

		webm: file_type_video,
		m4v: file_type_video,
		mkv: file_type_video,
		mp4: file_type_video,

		htm: file_type_web,
		html: file_type_web,

		sh: file_type_script,
		bash: file_type_script
	}

	// try to guess the correct URL handler for the specified target_path
	// this is an application link that opens the target_path if possible,
	// or a link that downloads the file/directory.
	this.url_for(target_path) {
		let file_extension = target_path.split(".").pop()
		if (this.test.directory(target_path)) {
			return cgi_commands.base_url() + "?" + this.enc_download_tar([ target_path ])
		} else if (this.file_extensions[file_extension]) {
			let handler = this.file_extensions[file_extension]
			return handler(target_path)
		} else if (this.test.file(target_path)) {
			return cgi_commands.base_url() + "?" + this.enc_download(target_path)
		}
	}
}
