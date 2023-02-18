// run a XMLHttpRequest
function make_xhr_async(url, method, content_type, body, cb, err_cb) {
	let req = new XMLHttpRequest()

	// on request completion call cb/err_cb
	req.onreadystatechange = function() {
		if (cb && (this.readyState) == 4 && (this.status == 200)) {
			return cb(url, this.responseText, req)
		} else if(err_cb && (this.readyState == 4)) {
			return err_cb(url, this.status, this.responseText, req)
		}
	}

	// set content-type header if any
	if (content_type) { req.setRequestHeader("Content-type", content_type); }

	// start the request
	req.open(method, url, true)
	req.send(body)

	// return request for convenience
	return req
}
// run a XMLHttpRequest synchronously, return responseText
function make_xhr_sync(url, method, content_type, body) {
	let req = new XMLHttpRequest()

	// set content-type header if any
	if (content_type) { req.setRequestHeader("Content-type", content_type); }

	// run the request
	req.open(method, url, false)
	req.send(body)

	// return request body if successful
	if (req.status == 200) {
		return req.responseText
	}
}
