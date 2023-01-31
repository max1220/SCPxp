let tabs_sections = document.getElementsByClassName("tabs")

// select a tab
function select_tab(tab_panels, target_tab_panel, tab_buttons, target_tab_button) {
	for (let tab_panel of tab_panels) {
		tab_panel.setAttribute("hidden", "")
	}
	for (let tab_button of tab_buttons) {
		tab_button.removeAttribute("aria-selected")
	}
	target_tab_button.setAttribute("aria-selected", "true")
	target_tab_panel.removeAttribute("hidden")
}

// Create onclick functions for every section of tabs
for (let tabs_section of tabs_sections) {
	// get corresponding buttons and panels
	let tab_list = tabs_section.querySelector("[role=tablist]")
	let tab_buttons = tab_list.querySelectorAll("[role=tab]")
	let tab_panels = tabs_section.querySelectorAll("[role=tabpanel]")

	// show the first selected tab
	let first_selected_button = tab_list.querySelector("[aria-selected=true]")
	let first_tab_panel_name = first_selected_button.getAttribute("aria-controls")
	let first_tab_panel = document.getElementById(first_tab_panel_name)
	select_tab(tab_panels, first_tab_panel, tab_buttons, first_selected_button)

	// add onclick functions to tab buttons
	let has_tab = false
	for (let tab_button of tab_buttons) {
		let tab_panel_name = tab_button.getAttribute("aria-controls")
		let tab_panel = document.getElementById(tab_panel_name)
		tab_button.onclick = function() {
			select_tab(tab_panels, tab_panel, tab_buttons, tab_button)
		}
	}
}
