// make a HTTP request, optionally call cb with the returned body
function make_xhr(url, method, content_type, body, cb, err_cb) {
	let req = new XMLHttpRequest()

	// register function to detect completion XHR
	req.onreadystatechange = function() {
		if (cb && (this.readyState) == 4 && (this.status == 200)) {
			return cb(url, this.responseText, req)
		} else if(err_cb && (this.readyState == 4)) {
			return err_cb(url, this.status, this.responseText, req)
		}
	}

	// configure the request
	req.open(method, url)
	if (content_type) {
		req.setRequestHeader("Content-type", content_type)
	}

	// send the request(req.onreadystatechange will call callback on completion)
	req.send(body)

	// return request for convenience
	return req
}
