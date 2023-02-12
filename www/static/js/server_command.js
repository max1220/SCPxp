// encode a set of arguments for the command API endpoint
function encode_command(command_str, args, content_type, headers, environment) {
	if (!command_str) { return; }
	let encoded = [ "command_str="+encodeURIComponent(command_str) ]

	// append content-type arg if any
	if (content_type) { encoded.push("content_type="+encodeURIComponent(content_type)); }

	// append header args if any
	if (args) {
		encoded = encoded.concat(
			args.map(function(arg) { return "arg=" + encodeURIComponent(arg) })
		)
	}

	// append encoded args if any
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

// run the command using an XHR
function run_command(command_str, args, content_type, headers, cb, err_cb) {
	let encoded_command = encode_command(command_str, args, content_type, headers)
	return make_xhr(
		"/cgi-bin/command.sh?"+encoded_command,
		"POST",
		"application/x-www-form-urlencoded",
		"",
		cb,
		err_cb
	)
}
