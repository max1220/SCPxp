let iframe_elem = document.getElementById("browser-content")
let urlbar_elem = document.getElementById("urlbar")

function btn_back() {
	iframe_elem.contentWindow.history.back()
}
function btn_forward() {
	iframe_elem.contentWindow.history.forward()
}
function btn_home() {
	home_elem.onclick = function() {
		iframe_elem.src = "about:blank"
	}
}
function btn_go() {
	let url_text = urlbar_elem.value
	if (url_text.startsWith("http://") || url_text.startsWith("https://")) {
		iframe_elem.src = urlbar_elem.value
	} else {
		iframe_elem.src = "http://" + urlbar_elem.value
	}
}
function onkeyup_urlbar() {
	if (event.key == "Enter" || event.keyCode == 13) {
		btn_go()
	}
}

// called by the WM when the window is loaded
function win_load() {
	win.title = "File manager"
	win.icon = "application-file-manager"
	win.resize(640, 400)
	win.update()
}


iframe_elem.onreadystatechange = function(e) {
	console.log("readystatechange", e)
	status_elem.innerHTML = "readystatechange: " + document.readyState
}

iframe_elem.onload = function() {
	let current_url = iframe_elem.contentWindow.location.href
	let status_left_elem = document.getElementById("status_left")
	status_left_elem.innerText = "Loaded: " + current_url
	urlbar_elem.value = current_url
	location.hash = "#"+current_url
}

let hash_loc = location.hash.substr(1)
if (hash_loc=="") {
	iframe_elem.src = location.origin;
} else {
	iframe_elem.src = decodeURIComponent(hash_loc);
}
