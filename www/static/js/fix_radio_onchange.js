// the onchange function that will be added to the change event,
// to call other onchange functions of all other radio buttons
// with the same name("call onchange on deselect of other affected elements").
function onchange_radio_dispatch_others(e) {
	if (!e.target.checked) { return; }
	document.querySelectorAll("input[type=radio]").forEach(function(elem) {
		if ((e.target.name==elem.name) && (e.target !== elem)) {
			elem.dispatchEvent(new Event("change"))
		}
	})
}

// "fix" the radio-button onchange function to update other affected elements as well,
// by adding an event listener and manually dispatching change events
function add_onchange_radio_dispatch_others() {
	document.querySelectorAll("input[type=radio]").forEach(function(elem) {
		elem.addEventListener("change", onchange_radio_dispatch_others)
	})
}
