/* Simple helper function to hide/unhide popup elements */
var on_show_popup_cb = undefined
var on_close_popup_cb = undefined

function show_popup(popup_elem_id) {
	let target_popup_elem = document.getElementById(popup_elem_id)
	let popups_elem = document.getElementById("popups")
	popups_elem.classList.remove("hidden")
	for (let i=0; i<popups_elem.children.length; i++) {
		let popup_elem = popups_elem.children[i]
		if (popup_elem == target_popup_elem) {
			popup_elem.classList.remove("hidden")
		} else {
			popup_elem.classList.add("hidden")
		}
	}
	if (on_show_popup_cb) { on_show_popup_cb() }
}
function close_popup() {
	let popups_elem = document.getElementById("popups")
	popups_elem.classList.add("hidden")
	for (let i=0; i<popups_elem.children.length; i++) {
		let popup_elem = popups_elem.children[i]
		popup_elem.classList.add("hidden")
	}
	if (on_close_popup_cb) { on_close_popup_cb() }
}
