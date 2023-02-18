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

		// append content_type arg if any
		if (content_type) { encoded.push("content_type="+encodeURIComponent(content_type)); }

		// append event_stream arg if any
		if (event_stream) { encoded.push("event_stream="+encodeURIComponent(event_stream)); }

		// append merge_stderr arg if any
		if (merge_stderr) { encoded.push("merge_stderr=true"); }

		// append header args if any
		if (headers) {
			encoded = encoded.concat(
				headers.map(function(header) { return "headers=" + encodeURIComponent(header) })
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

	// perform the XHR for an already-encoded command
	this.run_encoded_sync = function(url_args) {
		let req = make_xhr(
			base_url + "?" + url_args,
			"POST",
			"application/x-www-form-urlencoded",
			undefined,
			false
		)
		if (req.status == 200) {
			return req.responseText
		}
	}
	this.run_encoded_async = function(url_args, cb) {
		return make_xhr(
			base_url + "?" + url_args,
			"POST",
			"application/x-www-form-urlencoded",
			undefined,
			true,
			function(url, resp, req) {
				if (cb) { cb(resp); }
			}
		)
	}

	// encode then run a command
	this.run_command_sync = function(...args) {
		return this.run_encoded_sync(this.encode_command(...args))
	}
	this.run_command_async = function(cb, ...args) {
		return this.run_encoded_async(this.encode_command(...args), cb)
	}

	// run the command by starting an event-stream to read lines
	this.run_command_event_stream = function(command, environment, merge_stderr, bytes, stdout_cb, stderr_cb, ret_cb, begin_cb) {
		let encoded_command = this.encode_command(command, "text/event-stream", undefined, environment, bytes ? "bytes" : "lines", merge_stderr)
		let sse = new EventSource(base_url + "?" + encoded_command)

		// forward the events to the callbacks
		sse.addEventListener("begin", function(ev) {
			if (begin_cb) { begin_cb(); }
		})
		sse.addEventListener("stdout_line", function(ev) {
			if (stdout_cb) { stdout_cb(event.data); }
		})
		sse.addEventListener("stdout_byte", function(ev) {
			let char = String.fromCharCode(parseInt(event.data, 16))
			if (stdout_cb) { stdout_cb(char, true); }
		})
		sse.addEventListener("return", function(ev) {
			if (ret_cb) { ret_cb(parseInt(event.data)); }
		})

		// handle an error with the connection
		sse.onerror = function() { sse.close() }
		return sse
	}

	// call printenv and parse response
	this.get_env = function() {
		let env = {}
		this.make_xhr_sync("command_str=printenv").split("\n").map(function(pair_str) {
			let pair = pair_str.split("=")
			env[pair[0]] = pair.slice(1).join("=")
		})
		return env
	}

	// escape the shell argument using bash's strict quoting.
	this.escape_shell_arg = function(arg) {
		return `'${arg.replace(/'/g, `'\\''`)}'`;
	}
}
