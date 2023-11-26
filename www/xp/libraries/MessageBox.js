"use strict";

function MessageBox() {

	// generate URL for an info message box window, containing:
	// some text or html, an optional title with icon, optional blocktext, confirm/cancel button
	this.message_box_info = function(user_parms) {
		let base_url = "/xp/applications/message_box/info.html"
		return base_url + "?" + encode_parms_str(user_parms)
	}

	// generate URL for an input message box window, containing:
	// some text or html, an optional title with icon, input text field, confirm/cancel button
	this.message_box_input = function(user_parms) {
		let base_url = "/xp/applications/message_box/input.html"
		return base_url + "?" + encode_parms_str(user_parms)
	}

	// generate URL for an file selection message box window, containing:
	// some text or html, an icon, input text field, confirm/cancel button
	this.message_box_file = function(user_parms) {
		let base_url = "/xp/applications/message_box/file.html"
		return base_url + "?" + encode_parms_str(user_parms)
	}

	// generate URL for an file selection message box window, containing:
	// some text or html, an icon, input text field, confirm/cancel button
	this.message_box_command = function(user_parms) {
		let base_url = "/xp/applications/message_box/command.html"
		return base_url + "?" + encode_parms_str(user_parms)
	}

	// show the message box by opening a new dialog window.
	// Only works with a WindowManager!
	// cb is called with the message box result("confirm", "cancel", or "close")

	this.show_message_box_info = function(user_parms, cb) {
		let url = this.message_box_info(user_parms)
		return win.dialog_show(url, function(ret) {
			if (cb) { cb(ret) }
		}, !user_parms.greyout)
	}

	this.show_message_box_input = function(user_parms, cb) {
		let url = this.message_box_input(user_parms)
		return win.dialog_show(url, function(ret) {
			if (cb) { cb(ret) }
		}, !user_parms.greyout)
	}

	this.show_message_box_file = function(user_parms, cb) {
		let url = this.message_box_file(user_parms)
		return win.dialog_show(url, function(ret) {
			if (cb) { cb(ret) }
		}, !user_parms.greyout)
	}

	this.show_message_box_command = function(user_parms, cb) {
		let url = this.message_box_command(user_parms)
		return win.dialog_show(url, function(ret) {
			if (cb) { cb(ret) }
		}, !user_parms.greyout)
	}

	this.update_message_box = function(win_obj, user_parms) {
		let parms_str = encode_parms_str(user_parms)
		return win_obj.push_event("update_message_box", parms_str)
	}
}
