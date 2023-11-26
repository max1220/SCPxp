"use strict";

// decode a string containing encoded key=value pair
// seperated by "&" into an object(e.g. parse search arguments)
function decode_parms_str(str) {
	let parms = {}
	str.split("&").forEach(function(e) {
		let kv = e.split("=").map(function(e) {
			return decodeURIComponent(e.replace(/\+/g, " "))
		})
		let k = kv[0]
		let v = kv[1]
		if (Array.isArray(parms[k])) {
			parms[k].push(v)
		} else if (parms[k]) {
			parms[k] = [parms[k], v]
		} else {
			parms[k] = v
		}
	})
	return parms
}

// encode an object into a string(see decode_parms_str)
// object should be flat
function encode_parms_str(obj) {
	let parms_str = []
	for (let key in obj) {
		let value = obj[key]
		if (Array.isArray(value)) {
			for (let i=0; i<value.length; i++) {
				parms_str.push(encodeURIComponent(key) + "=" + encodeURIComponent(value[i]))
			}
		} else {
			parms_str.push(encodeURIComponent(key) + "=" + encodeURIComponent(value))
		}
	}
	return parms_str.join("&")
}



// run a XMLHttpRequest
function make_xhr_async(url, method, content_type, body, cb, err_cb, progress_cb) {
	let req = new XMLHttpRequest()

	// on request completion call cb/err_cb
	req.onreadystatechange = function() {
		if (cb && (this.readyState) == 4 && (this.status == 200)) {
			return cb(url, this.responseText, req)
		} else if(err_cb && (this.readyState == 4)) {
			return err_cb(url, this.status, this.responseText, req)
		}
	}
	req.upload.onprogress = function(e) {
		if (!progress_cb) { return; }
		progress_cb(e)
	}

	// open the request
	req.open(method, url, true)

	// set content-type header if any
	if (content_type) { req.setRequestHeader("Content-type", content_type); }

	// send the request
	req.send(body)

	// return request for convenience
	return req
}

// run a XMLHttpRequest synchronously, return responseText
function make_xhr_sync(url, method, content_type, body) {
	let req = new XMLHttpRequest()

	// open the request
	req.open(method, url, false)

	// set content-type header if any
	if (content_type) { req.setRequestHeader("Content-type", content_type); }

	// send the request
	req.send(body)

	// return request body if successful
	if (req.status == 200) {
		return req.responseText
	}
}



// handle clicking a tab: update tab buttons, show/hide tab panels
function tab_onlick() {
	let tab_button = event.target
	let tab_group = tab_button.getAttribute("data-tabgroup")
	let tab_panel = document.getElementById(tab_button.getAttribute("aria-controls"))

	let _tab_group = tab_group.replace(/["\\]/g, '\\$&')
	let tab_buttons = document.querySelectorAll("[role=tab][data-tabgroup="+_tab_group+"]")
	let tab_panels = document.querySelectorAll("[role=tabpanel][data-tabgroup="+_tab_group+"]")

	for (let c_tab_button of tab_buttons) {
		c_tab_button.setAttribute("aria-selected", "false")
	}
	for (let c_tab_panel of tab_panels) {
		//c_tab_panel.classList.add("hidden")
		c_tab_panel.setAttribute("hidden", true)
	}

	//tab_panel.classList.remove("hidden")
	tab_panel.removeAttribute("hidden")
	tab_button.setAttribute("aria-selected", "true")
}



// access the search parameters(part of the URL after ?)
var SEARCH_PARMS = new Proxy({}, {
	get: function(target, prop, receiver) {
		let search_args = decode_parms_str(location.search.substr(1))
		return Reflect.get(search_args, prop, receiver)
	},
	set: function(target, prop, value) {
		let search_args = decode_parms_str(location.search.substr(1))
		let ret = Reflect.set(search_args, prop, value)
		location.search = "?" + encode_parms_str(search_args)
		return ret
	}
})

// access the search parameters(part of the URL after #)
var HASH_PARMS = new Proxy({}, {
	get: function(target, prop, receiver) {
		let hash_args = decode_parms_str(location.hash.substr(1))
		return Reflect.get(hash_args, prop, receiver)
	},
	set: function(target, prop, value) {
		let hash_args = decode_parms_str(location.hash.substr(1))
		let ret = Reflect.set(hash_args, prop, value)
		location.hash = "#" + encode_parms_str(hash_args)
		return ret
	}
})

// access HTML elements by ID(cached)
var HTML_ELEM = new Proxy({}, {
	get: function(target, prop, receiver) {
		let cached_elem = Reflect.get(target, prop, receiver)
		if (cached_elem !== undefined) {
			return cached_elem;
		}
		let elem = document.getElementById(prop)
		Reflect.set(target, prop, elem)
		return Reflect.get(target, prop, receiver)
	},
	set: function(target, prop, value) {
		let elem = Reflect.get(target, prop, receiver) || document.getElementById(prop)
		if (elem) {
			elem.replaceWith(value)
			return true;
		}
	}
})

// access the .value or .innerText of an HTML element based on it's type
var HTML_VALUE = new Proxy({}, {
	get: function(target, prop, receiver) {
		let elem = document.getElementById(prop)
		if (!elem) { return Reflect.get(target, prop, receiver) }
		if (elem.nodeName == "INPUT") {
			if ((elem.type == "checkbox") || (elem.type == "radio")) {
				return elem.checked
			} else {
				return elem.value
			}
		} else if (elem.nodeName == "TEXTAREA") {
			return elem.value
		} else {
			return elem.innerText
		}
	},
	set: function(target, prop, value) {
		let elem = document.getElementById(prop)
		if (!elem) { return; }
		if (elem.nodeName == "INPUT") {
			if ((elem.type == "checkbox") || (elem.type == "radio")) {
				elem.checked = value
			} else {
				elem.value = value
			}
		} else if (elem.nodeName == "TEXTAREA") {
			elem.value = value
		} else {
			elem.innerText = value
		}
	}
})

// access local storage values(stored as JSON)
var LOCAL_STORAGE_PREFIX = "SCPXP_";
var LOCAL_STORAGE = new Proxy({}, {
	get: function(target, prop, receiver) {
		let val = localStorage.getItem(LOCAL_STORAGE_PREFIX+prop)
		return JSON.parse(val)
	},
	set: function(target, prop, value) {
		let val = JSON.stringify(value)
		localStorage.setItem(LOCAL_STORAGE_PREFIX+prop, val)
	}
})



// "fix" the radio-button onchange function to update other affected elements as well,
// by adding an event listener and manually dispatching change events
function fix_radio_onchange() {
	let onchange_radio_dispatch_others = function(e) {
		if (!e.target.checked) { return; }
		document.querySelectorAll("input[type=radio]").forEach(function(elem) {
			if ((e.target.name==elem.name) && (e.target !== elem)) {
				elem.dispatchEvent(new Event("change"))
			}
		})
	}
	document.querySelectorAll("input[type=radio]").forEach(function(elem) {
		elem.addEventListener("change", onchange_radio_dispatch_others)
	})
}

// fix the link target problem by overriding the onclick behaviour of <a> elements with a target= attribute set.
var orig_open = open
function fixed_open(url, target, specs, replace) {
	let iframe_elem
	if (target) {
		iframe_elem = document.getElementsByName(target)[0] || parent.document.getElementsByName(target)[0]
	}
	if (iframe_elem) {
		iframe_elem.src = url
		return
	} else {
		return orig_open(url, target, specs, replace)
	}
}

// fix the link target problem by overriding the onclick behaviour of <a> elements with a target= attribute set.
function fix_link_targets_iframe() {
	// set of already-fixed links
	let fixed_links = new Set()

	// iterate over all links
	for (let elem of document.getElementsByTagName("a")) {

		// skip already-known links
		if (fixed_links.has(elem)) { continue; }

		// skip links that don't have both href and target
		if (!elem.href || !elem.target) { continue; }

		// handle onclick(preserve original onclick)
		let original_onclick = elem.onclick
		elem.onclick = function(e) {
			// look in this document for iframe of this name
			let iframe_elem = document.getElementsByName(elem.target)[0] || parent.document.getElementsByName(elem.target)[0]
			if (original_onclick) {
				original_onclick(e)
			}
			if (iframe_elem) {
				iframe_elem.src = elem.href
				return e.preventDefault()
			}
		}
	}
}

// apply all required fixes
function apply_fixes() {
	fix_radio_onchange()
	if (window.chrome) {
		// these fixes are only needed for chrome-like browsers
		window.open = fixed_open
		fix_link_targets_iframe()
	}
}

// appply the currently configured theme
function apply_theme() {
	let css_theme_elem = document.getElementById("css-theme")
	let icon_theme_elem = document.getElementById("icon-theme")
	if (LOCAL_STORAGE.css_them && css_theme_elem) {
		css_theme_elem.href = LOCAL_STORAGE.css_them
	}
	if (LOCAL_STORAGE.icon_them && icon_theme_elem) {
		icon_theme_elem.href = LOCAL_STORAGE.icon_them
	}
}



apply_fixes()
apply_theme()
