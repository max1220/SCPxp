"use strict";

// This is a library for working with the www/cgi-bin/cgi_command.sh script.
// Executing server commands via CGI, and optionally streams the output as event-stream.
// Allows to set the response headers, including content-type,
// and allows setting environment variables on server for the command.
// Allows all methods, parameters are always part of the URL.



function CgiCommands(base_url) {
	// encode a set of arguments for the command API endpoint
	this.encode_command = function(command, content_type, headers, environment, event_stream, merge_stderr) {
		let command_str = command[0]
		if (!command_str) { throw new Error("No command provided!"); }
		let command_args = command.slice(1)

		// encode the command_str
		let encoded = [ "command_str="+encodeURIComponent(command_str) ]

		// append encoded command arguments
		encoded = encoded.concat(
			command_args.map(function(arg) { return "arg=" + encodeURIComponent(arg) })
		)

		// append event_stream arg and override content_type
		if (event_stream) {
			content_type = "text/event-stream"
			encoded.push("event_stream="+encodeURIComponent(event_stream));
		}

		// append content_type arg if any
		if (content_type) { encoded.push("content_type="+encodeURIComponent(content_type)); }

		// append merge_stderr arg if any
		if (merge_stderr) { encoded.push("merge_stderr=true"); }

		// append header args if any
		if (headers) {
			encoded = encoded.concat(
				headers.map(function(header) { return "header=" + encodeURIComponent(header) })
			)
		}

		// add environment variables if any
		if (environment) {
			encoded = encoded.concat(
				environment.map(function(env_var) {
					return "env_key=" + encodeURIComponent(env_var[0]) + "&env_value=" + encodeURIComponent(env_var[1])
				})
			)
		}

		// return complete encoded arguments
		return encoded.join("&")
	}

	// perform the XHR for an already-encoded command synchronously
	// the return value is the body of a sucessful request, or undefined
	this.run_encoded_sync = function(url_args, body) {
		return make_xhr_sync(
			base_url + "?" + url_args,
			"POST",
			"application/x-www-form-urlencoded",
			body
		)
	}

	// perform the XHR for an already-encoded command asynchronously
	// cb is called with a sucessful request body as arugment
	// the return value is the generated XHR
	this.run_encoded_async = function(url_args, cb, body, progress_cb) {
		return make_xhr_async(
			base_url + "?" + url_args,
			"POST",
			"application/x-www-form-urlencoded",
			body,
			function(url, resp, req) {
				if (cb) { cb(resp); }
			},
			undefined,
			function(e) {
				if (progress_cb) { progress_cb(e) }
			}
		)
	}

	// run the already-encoded command by starting an event-stream to read lines
	this.run_encoded_event_stream = function(encoded_command, stdout_cb, ret_cb, open_cb) {
		let sse = new EventSource(base_url + "?" + encoded_command)
		sse.addEventListener("stdout_line", function(ev) {
			if (stdout_cb) { stdout_cb(event.data); }
		})
		sse.addEventListener("stdout_byte", function(ev) {
			let char_code = parseInt(event.data, 16)
			let char = String.fromCharCode(char_code)
			if (stdout_cb) { stdout_cb(char, char_code); }
		})
		sse.addEventListener("return", function(ev) {
			if (ret_cb) { ret_cb(parseInt(event.data)); }
		})
		sse.addEventListener("error", function() {
			sse.close()
		})
		sse.addEventListener("open", function() {
			if (open_cb) { open_cb(); }
		})
		return sse
	}

	// encode and run a command
	this.run_command_sync = function(...args) {
		return this.run_encoded_sync(this.encode_command(...args))
	}
	this.run_command_async = function(cb, ...args) {
		return this.run_encoded_async(this.encode_command(...args), cb)
	}
	this.run_command_event_stream = function(stdout_cb, ret_cb, open_cb, stream_bytes, command, environment, merge_stderr) {
		let event_stream_type = stream_bytes ? "bytes" : "lines"
		let encoded_command = this.encode_command(command, "text/event-stream", undefined, environment, event_stream_type, merge_stderr)
		return this.run_encoded_event_stream(encoded_command, stdout_cb, ret_cb, open_cb)
	}

	// call printenv and parse response
	this.get_env = function() {
		let env = {}
		let env_str = this.run_command_sync([ "printenv" ])
		env_str.split(/\r?\n/).map(function(pair_str) {
			let pair = pair_str.split("=")
			env[pair[0]] = pair.slice(1).join("=")
		})
		return env
	}

	// utillity function
	this.base_url = function(encoded_args) {
		if (encoded_args) {
			return base_url + "?" + encoded_args
		} else {
			return base_url
		}
	}

	this.escape_shell_args = function(args) {
		return args.map(function(e) {
			return this.escape_shell_arg(e)
		}, this).join(" ")
	}

	// escape the shell argument using bash's strict quoting.
	this.escape_shell_arg = function(arg) {
		return `'${String(arg).replace(/'/g, `'\\''`)}'`;
	}
}
