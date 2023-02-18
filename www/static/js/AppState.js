// The AppState constructor is used to manage an object(data_obj) that
// is automatically updating it's state to three possible backends:
// The HTML document, via html_data_updater,
// the #Hash part of the URL, via hash_args_parser, and
// window.localStorage/window.sessionStorage passed via storage_obj.


// dispatch an onchange event
function trigger_onchange(elem) {
	elem.dispatchEvent(new Event("change"))
}

// create a new KeyValueParser to manage arguments in the key=value URL-style.
function HashArgsParser(data_obj, key_to_type, type_to_encoder, type_to_decoder) {
	// encode a single key of the data_obj that points to a single value
	this.encode_kv = function(key, value) {
		let data_type = key_to_type[key]
		let str_encoder = type_to_encoder[data_type]
		if (!str_encoder) { return; }
		let enc_value = str_encoder(value)
		if (enc_value===undefined) { return; }
		return encodeURIComponent(key) + "=" + encodeURIComponent(enc_value)
	}

	// encode the list array_value using the encoder for data_type
	this.encode_array = function(key, array_values) {
		// URI-encode each array element as [enc_data_key]=[array element]
		let data_type = key_to_type[key]
		let str_encoder = type_to_encoder[data_type]
		if (!str_encoder) { return; }
		let enc_array_values = array_value.filter(function(array_value) {
			let enc_value = str_encoder(array_value)
			if (enc_value===undefined) { return; }
			return encodeURIComponent(data_key) + "=" + encodeURIComponent(enc_value)
		})
		return enc_hash_values.join("&")
	}

	// encode the data_obj into a string
	this.encode_obj = function() {
		let enc_str = []
		for (let data_key in data_obj) {
			let data_value = data_obj[data_key]
			if (Array.isArray(data_value)) {
				// add an array value
				let enc_str = this.encode_array(data_key, data_value)
				if (enc_str!==undefined) { enc_str.push(enc_str) }
			} else {
				// add a single value
				let enc_pair_str = this.encode_kv(data_key, data_value)
				if (enc_pair_str!==undefined) { enc_str.push(enc_pair_str) }
			}
		}
		return enc_str.join("&")
	}

	// update the current hash location
	this.update_hash_from_data = function() {
		location.hash = "#" + this.encode_obj();
		return true
	}

	// decode a single already-decoded hash key-value pair
	this.update_data_from_hash_pair = function(hash_pair) {
		let hash_key = hash_pair[0]
		let hash_value_str = hash_pair[1]
		let hash_type = key_to_type[hash_key]
		let decoder = type_to_decoder[hash_type]
		if (!decoder) { return; }
		let hash_value = decoder(hash_value_str)
		if (hash_value===undefined) { return; }
		data_obj[hash_key] = hash_value
		return true
	}

	// decode URL-style key-value arguments from the hash part of the URL to the hash_args
	this.update_data_from_hash_str = function(hash_str) {
		// get the argument part of the URL
		let hash_args_str = hash_str.startsWith("#") ? hash_str.substr(1) : hash_str
		if (hash_args_str === "") { return; }

		// decode into a list of URI-decoded key-value pairs
		let hash_args_list = hash_args_str.split("&").map(function(kv_str) {
			return kv_str.split("=").map(decodeURIComponent)
		})

		// iterate over the key-value pairs and add to data object
		hash_args_list.forEach(function(hash_pair) {
			this.update_data_from_hash_pair(hash_pair)
		}, this)
		return true
	}

	// decode the current hash location
	this.update_data_from_hash = function() {
		this.decode_hash_str(location.hash)
		return true
	}

}

// create a new HtmlDataUpdater to manage HTML elements from a data source
function HtmlDataUpdater(elems_selector, elems_attr_key, elems_attr_type, elems_attr_invalid, elems_attr_onchange) {
	// look up an decoder function from an attribute type
	this.html_type_to_html_decoder = {
		"input-integer": function(elem) {
			let n = parseInt(elem.value)
			if (n==NaN) { return; }
			return n
		},
		"input-float": function(elem) {
			let n = parseFloat(elem.value)
			if (n==NaN) { return; }
			return n
		},
		"input-boolean": function(elem) {
			if (elem.checked) { return true; }
			else { return false; }
		},
		"input-text": function(elem) {
			return String(elem.value)
		}
	}

	// look up an encoder function from an attribute type
	this.html_type_to_html_encoder = {
		"input-integer": function(elem, data_value) { elem.value=String(data_value); },
		"input-float": function(elem, data_value) { elem.value=String(data_value); },
		"input-boolean": function(elem, data_value) { elem.checked = (!!data_value); },
		"input-text": function(elem, data_value) { elem.value=String(data_value); }
	}

	// call cb with elements matching elems_selector and having a elems_attr_key attribute
	this.for_each_element = function(cb) {
		document.querySelectorAll(elems_selector).forEach(function(elem) {
			if (elem.hasAttribute(elems_attr_key)) {
				cb.bind(this)(elem);
			}
		}, this)
	}

	// get an element by the current query selector and attribute name and value
	this.get_elem_by_attribute_value = function(attr_value) {
		let found_elem = undefined
		this.for_each_element(function(elem) {
			if (elem.getAttribute(elems_attr_key) === attr_value) {
				found_elem = elem
			}
		})
		return found_elem
	}

	// get the decoded value from the element
	this.get_decoded_elem = function(elem) {
		let data_obj = elem.onchange_data_obj
		if (!data_obj) { return; }
		let data_key = elem.getAttribute(elems_attr_key)
		let html_type = elem.getAttribute(elems_attr_type)
		let html_decoder = this.html_type_to_html_decoder[html_type]
		if (!html_decoder) { return; }
		return html_decoder(elem)
	}

	// the onChange handler for all matching elements
	this.on_elem_change = function(ev) {
		this.update_data_from_html_elem(ev.target)
	}

	// register event handlers for HTML elements matching the selector and having a elems_attr_key attribute
	this.registerChangeEventHandlers = function(data_obj) {
		document.querySelectorAll(elems_selector).forEach(function(elem) {
			if (elem.hasAttribute(elems_attr_onchange)) {
				elem.onchange_data_obj = data_obj
				elem.addEventListener("change", this.on_elem_change.bind(this))
			}
		}, this)
	}

	// update data_obj from HTML element content(shortcut to dispatch onchange event)
	this.update_data_from_html_elem = function(elem) {
		let data_obj = elem.onchange_data_obj
		let data_key = elem.getAttribute(elems_attr_key)
		if (!data_obj) { return; }
		let new_value = this.get_decoded_elem(elem)
		if (new_value===undefined) {
			elem.setAttribute(elems_attr_invalid, "true")
		} else {
			// have valid new value, update data_obj
			elem.setAttribute(elems_attr_invalid, "false")
			data_obj[data_key] = new_value
		}
	}

	// update data_obj from HTML element referenced by data_key
	this.update_data_from_html_key = function(data_key) {
		let update_elem = this.get_elem_by_attribute_value(data_key)
		if (update_elem) { return; }
		this.update_data_from_html_elem(update_elem)
	}

	// update data_obj from all HTML elements
	this.update_data_from_html_all = function() {
		this.for_each_element(this.update_data_from_html_elem)
	}

	// update the specified HTML element with a new value from the data_obj
	this.update_html_from_data_elem = function(update_elem) {
		if (!update_elem.hasAttribute(elems_attr_key)) { return; }
		let data_obj = update_elem.onchange_data_obj
		if (!data_obj) { return; }
		let data_key = update_elem.getAttribute(elems_attr_key)
		let data_type = update_elem.getAttribute(elems_attr_type)
		let html_encoder = this.html_type_to_html_encoder[data_type]
		if (!html_encoder) { return; }
		// update the HTML
		update_elem.setAttribute(elems_attr_invalid, "false")
		html_encoder(update_elem, data_obj[data_key])
	}

	// update a HTML element specified via data_key with a new value from the data_obj
	this.update_html_from_data_key = function(data_key) {
		let update_elem = this.get_elem_by_attribute_value(data_key)
		if (!update_elem) { return; }
		this.update_html_from_data_elem(update_elem)
	}

	// update all HTML elements with values from data_obj
	this.update_html_from_data_all = function() {
		document.querySelectorAll(elems_selector).forEach(this.update_html_from_data_elem, this)
	}

}

// create a new StorageManager to manage the localStorage/sessionStorage with a data_obj
function StorageManager(data_obj, is_session, key_to_type, type_to_encoder, type_to_decoder) {
	this.storage_obj = is_session ? window.sessionStorage : window.localStorage

	// decode a storage values into data_obj by key
	this.update_data_from_storage_key = function(storage_key) {
		let storage_value_str = this.storage_obj.getItem(storage_key)
		let storage_type = key_to_type[storage_key]
		let str_decoder = type_to_decoder[storage_type]
		if (!str_decoder) { return; }
		let storage_value = str_decoder(storage_value_str)
		if (storage_value===undefined) { return; }
		data_obj[storage_key] = storage_value
		return true
	}

	// decode all storage values into data_obj
	this.update_data_from_storage_all = function() {
		for (let i=0; i<this.storage_obj.length; i++) {
			this.update_data_from_storage_key(this.storage_obj.key(i))
		}
	}

	// update a value from data_obj in storage by key
	this.update_storage_from_data_key = function(data_key) {
		let data_value = data_obj[data_key]
		let data_type = key_to_type[data_key]
		let str_encoder = type_to_encoder[data_type]
		if (!str_encoder) { return; }
		let data_value_str = str_encoder(data_value)
		if (data_value_str===undefined) { return; }
		this.storage_obj.setItem(data_key, data_value_str)
	}

	// update all values from data_obj in storage
	this.update_storage_from_data_all = function() {
		for (let data_key in data_obj) {
			this.update_storage_from_data_key(data_key)
		}
	}

}

function AppState(data_obj) {
	// this object is used to resolve an index into the data_obj into a type
	this.key_to_type = {}

	this.html_data_updater = undefined
	this.hash_args_parser = undefined
	this.storage_manager_local = undefined
	this.storage_manager_session = undefined

	// set the value of key to true to disable the encoding in the specified storage
	this.key_to_enable_hash = {}
	this.key_to_enable_html = {}
	this.key_to_enable_session_storage = {}
	this.key_to_enable_local_storage = {}
	this.type_to_enable_hash = {}
	this.type_to_enable_html = {}
	this.type_to_enable_session_storage = {}
	this.type_to_enable_local_storage = {}

	// This object is used to resolve a type to an encoder function.
	// The encoder function should return a string for every valid input value.
	this.type_to_encoder = {
		boolean: function(val) {
			if (val===true) { return "true"; }
			else if (val===false) { return "false"; }
			else { throw new Error("Not a boolean value!") }
		},
		integer: function(val) {
			if (parseInt(val) !== NaN) { return String(val); }
			else { throw new Error("Not an integer value!") }
		},
		float: function(val) {
			if (parseFloat(val) !== NaN) { return String(val); }
			else { throw new Error("Not a float value!") }
		},
		text: function(val) {
			return String(val)
		}
	}

	// This object is used to resolve a type to an encoder function.
	// The decoder function should return a value for every valid string input string.
	this.type_to_decoder = {
		boolean: function(str_val) {
			if (str_val==="true") { return true; }
			else if (str_val==="false") { return false; }
			else { throw new Error("Not a boolean value!") }
		},
		integer: function(str_val) {
			if (parseInt(str_val) !== NaN) { return parseInt(str_val); }
			else { throw new Error("Not an integer value!") }
		},
		float: function(str_val) {
			if (parseFloat(str_val) !== NaN) { return parseFloat(str_val); }
			else { throw new Error("Not a float value!") }
		},
		text: function(str_val) {
			return String(str_val)
		}
	}


	// check if the data_key should be updated in the respective backends
	this.is_hash_enabled = function(data_key) {
		return this.key_to_enable_hash[data_key] || this.type_to_enable_hash[this.key_to_type[data_key]]
	}
	this.is_html_enabled = function(data_key) {
		return this.key_to_enable_html[data_key] || this.type_to_enable_html[this.key_to_type[data_key]]
	}
	this.is_session_storage_enabled = function(data_key) {
		return this.key_to_enable_session_storage[data_key] || this.type_to_enable_session_storage[this.key_to_type[data_key]]
	}
	this.is_local_storage_enabled = function(data_key) {
		return this.key_to_enable_local_storage[data_key] || this.type_to_enable_local_storage[this.key_to_type[data_key]]
	}

	// add the parameters for the specified key
	this.add_key_parameters = function(key, type, enable_html, enable_hash, enable_session_storage, enable_local_storage) {
		if (type !== undefined) { this.key_to_type[key] = type }
		if (enable_hash !== undefined) { this.key_to_enable_hash[key] = enable_hash }
		if (enable_html !== undefined) { this.key_to_enable_html[key] = enable_html }
		if (enable_session_storage !== undefined) { this.key_to_enable_session_storage[key] = enable_session_storage }
		if (enable_local_storage !== undefined) { this.key_to_enable_local_storage[key] = enable_local_storage }
	}

	// add the parameters for the specified type
	this.add_type_parameters = function(type, enable_html, enable_hash, enable_session_storage, enable_local_storage, encoder, decoder) {
		if (enable_hash!==undefined) { this.type_to_enable_hash[type] = enable_hash }
		if (enable_html!==undefined) { this.type_to_enable_html[type] = enable_html }
		if (enable_session_storage!==undefined) { this.type_to_enable_session_storage[type] = enable_session_storage }
		if (enable_local_storage!==undefined) { this.type_to_enable_local_storage[type] = enable_local_storage }
		if (encoder!==undefined) { this.type_to_encoder[type] = encoder }
		if (decoder!==undefined) { this.type_to_decoder[type] = decoder }
	}


	// update the HTML, hash, and storage backends for the data_key after it has been modified
	this.update_value = function(data_key) {
		if (this.is_html_enabled(data_key)) {
			this.html_data_updater.update_html_from_data_key(data_key);
		}
		if (this.is_hash_enabled(data_key)) {
			this.hash_args_parser.update_hash_from_data()
		}
		if (this.is_session_storage_enabled(data_key)) {
			this.storage_manager_session.update_storage_from_data_key(data_key)
		}
		if (this.is_local_storage_enabled(data_key)) {
			this.storage_manager_local.update_storage_from_data_key(data_key)
		}
	}

	// call the load functions in the appropriate order
	this.load = function() {
		this.html_data_updater = new HtmlDataUpdater("input", "data-update-key", "data-update-type", "data-update-invalid", "data-update-onchange")
		this.hash_args_parser = new HashArgsParser(this.data, this.key_to_type, this.type_to_encoder, this.type_to_decoder)
		this.storage_manager_local = new StorageManager(this.data, false, this.key_to_type, this.type_to_encoder, this.type_to_decoder)
		this.storage_manager_session = new StorageManager(this.data, true, this.key_to_type, this.type_to_encoder, this.type_to_decoder)

		// automatic updates might re-set the hash values
		let hash_args_str = location.hash

		// register the onChange event handlers for the selected elements
		this.html_data_updater.registerChangeEventHandlers(this.data)

		// update with initial values from HTML elements
		this.html_data_updater.update_data_from_html_all()

		// update with values from localStorage
		this.storage_manager_local.update_data_from_storage_all()

		// update with initial values from hash arguments(current URL overrides)
		this.hash_args_parser.update_data_from_hash_str(hash_args_str)

		// update with values from sessionStorage
		this.storage_manager_session.update_data_from_storage_all()
	}

	// the set function for the data object(automatically update backend values)
	this.data_set = function(target, prop, value) {
		let ret = Reflect.set(target, prop, value)
		this.update_value(prop)
		return ret
	}

	// the data object is a proxy that automatically updates the relevant data backends
	this.data = new Proxy(data_obj, {
		set: this.data_set.bind(this)
	})
}
