// make a HTTP request, optionally call cb with the returned body
function make_xhr(url, method, content_type, body, cb) {
	let req = new XMLHttpRequest()
	if (cb) {
		req.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200) {
				cb(url, this.responseText)
			}
		}
	}
	req.open(method, url)
	req.setRequestHeader("Content-type", content_type)
	req.send(body)
	return req
}
